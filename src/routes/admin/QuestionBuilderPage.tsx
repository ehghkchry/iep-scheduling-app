import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useEventContext } from './EventLayout'
import QuestionEditor from '../../components/QuestionBuilder/QuestionEditor'
import type { QuestionDraft } from '../../components/QuestionBuilder/QuestionEditor'
import { hasOptions } from '../../lib/types'
import type { QuestionRow, QuestionOptionRow } from '../../lib/types'

export default function QuestionBuilderPage() {
  const { event } = useEventContext()

  const [drafts, setDrafts] = useState<QuestionDraft[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  const loadQuestions = useCallback(async () => {
    const { data: questions, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', event.id)
      .order('order_index')

    if (questionError) {
      setError(questionError.message)
      return
    }

    const rows = (questions ?? []) as QuestionRow[]
    const ids = rows.map((row) => row.id)

    let optionRows: QuestionOptionRow[] = []
    if (ids.length > 0) {
      const { data: options, error: optionError } = await supabase
        .from('question_options')
        .select('*')
        .in('question_id', ids)
        .order('order_index')

      if (optionError) {
        setError(optionError.message)
        return
      }
      optionRows = (options ?? []) as QuestionOptionRow[]
    }

    setDrafts(
      rows.map((row) => ({
        id: row.id,
        question_text: row.question_text,
        question_type: row.question_type,
        options: optionRows
          .filter((option) => option.question_id === row.id)
          .map((option) => option.option_text),
        dirty: false,
      })),
    )
  }, [event.id])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  function addQuestion() {
    setDrafts((prev) => [
      ...(prev ?? []),
      { id: null, question_text: '', question_type: 'short_text', options: [], dirty: true },
    ])
  }

  function updateDraft(index: number, next: QuestionDraft) {
    setDrafts((prev) => prev?.map((draft, i) => (i === index ? next : draft)) ?? null)
  }

  /**
   * 선택지는 지웠다 다시 넣는다. 답변이 선택지 id가 아니라 텍스트를 저장하고 있어서
   * 이렇게 해도 이미 제출된 응답이 깨지지 않는다.
   */
  async function replaceOptions(questionId: string, options: string[]) {
    await supabase.from('question_options').delete().eq('question_id', questionId)

    const cleaned = options.map((option) => option.trim()).filter((option) => option.length > 0)
    if (cleaned.length === 0) return

    const { error: insertError } = await supabase.from('question_options').insert(
      cleaned.map((option_text, order_index) => ({ question_id: questionId, option_text, order_index })),
    )
    if (insertError) throw new Error(insertError.message)
  }

  async function saveDraft(index: number) {
    const draft = drafts?.[index]
    if (!draft) return

    setError(null)
    setSavingIndex(index)
    try {
      const payload = {
        event_id: event.id,
        order_index: index,
        question_text: draft.question_text.trim(),
        question_type: draft.question_type,
      }

      let questionId = draft.id

      if (questionId === null) {
        const { data, error: insertError } = await supabase
          .from('questions')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)
        questionId = data.id as string
      } else {
        const { error: updateError } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', questionId)
        if (updateError) throw new Error(updateError.message)
      }

      if (hasOptions(draft.question_type)) {
        await replaceOptions(questionId, draft.options)
      } else {
        await supabase.from('question_options').delete().eq('question_id', questionId)
      }

      await loadQuestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문을 저장하지 못했습니다.')
    } finally {
      setSavingIndex(null)
    }
  }

  async function deleteDraft(index: number) {
    const draft = drafts?.[index]
    if (!draft) return

    if (draft.id === null) {
      setDrafts((prev) => prev?.filter((_, i) => i !== index) ?? null)
      return
    }

    const confirmed = window.confirm(
      '이 질문을 삭제하면 이미 제출된 학부모 응답에서도 해당 답변이 사라집니다. 삭제할까요?',
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase.from('questions').delete().eq('id', draft.id)
    if (deleteError) setError(deleteError.message)
    else await loadQuestions()
  }

  async function moveDraft(index: number, direction: -1 | 1) {
    if (!drafts) return
    const target = index + direction
    if (target < 0 || target >= drafts.length) return

    const reordered = [...drafts]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setDrafts(reordered)

    const updates = reordered
      .map((draft, order_index) => ({ id: draft.id, order_index }))
      .filter((row): row is { id: string; order_index: number } => row.id !== null)

    for (const row of updates) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({ order_index: row.order_index })
        .eq('id', row.id)
      if (updateError) {
        setError(updateError.message)
        break
      }
    }
  }

  return (
    <div className="stack stack--lg">
      <section className="stack stack--sm">
        <h2>학부모님께 드릴 질문</h2>
        <p className="muted">
          여기에 만든 질문은 <strong>모두 필수</strong>입니다. 학부모님이 하나라도 빠뜨리면 제출할 수
          없습니다.
        </p>
        <div className="alert alert--info">
          학생 이름은 앱이 항상 먼저 물어보므로 따로 만들지 않으셔도 됩니다.
        </div>
      </section>

      {error && <div className="alert alert--error">{error}</div>}

      {!drafts && <p className="muted">불러오는 중…</p>}

      {drafts?.length === 0 && (
        <div className="empty">
          아직 만든 질문이 없습니다.
          <br />
          질문이 없어도 학부모님은 이름과 시간만 골라 제출할 수 있습니다.
        </div>
      )}

      {drafts?.map((draft, index) => (
        <QuestionEditor
          key={draft.id ?? `new-${index}`}
          draft={draft}
          index={index}
          total={drafts.length}
          saving={savingIndex === index}
          onChange={(next) => updateDraft(index, next)}
          onSave={() => void saveDraft(index)}
          onDelete={() => void deleteDraft(index)}
          onMove={(direction) => void moveDraft(index, direction)}
        />
      ))}

      {drafts && (
        <button className="btn btn--primary" type="button" onClick={addQuestion}>
          질문 추가
        </button>
      )}
    </div>
  )
}
