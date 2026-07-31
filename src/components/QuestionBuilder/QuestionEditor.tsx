import OptionListEditor from './OptionListEditor'
import { QUESTION_TYPE_LABELS, hasOptions } from '../../lib/types'
import type { QuestionType } from '../../lib/types'

export interface QuestionDraft {
  /** null이면 아직 저장되지 않은 새 질문 */
  id: string | null
  question_text: string
  question_type: QuestionType
  options: string[]
  dirty: boolean
}

const TYPE_ORDER: QuestionType[] = [
  'short_text',
  'paragraph',
  'single_choice',
  'multi_choice',
  'dropdown',
]

export default function QuestionEditor({
  draft,
  index,
  total,
  saving,
  onChange,
  onSave,
  onDelete,
  onMove,
}: {
  draft: QuestionDraft
  index: number
  total: number
  saving: boolean
  onChange: (next: QuestionDraft) => void
  onSave: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}) {
  function update(patch: Partial<QuestionDraft>) {
    onChange({ ...draft, ...patch, dirty: true })
  }

  function handleTypeChange(nextType: QuestionType) {
    // 선택지가 없던 유형에서 넘어오면 빈 칸 두 개로 시작하게 해준다
    const needsOptions = hasOptions(nextType)
    update({
      question_type: nextType,
      options: needsOptions && draft.options.length === 0 ? ['', ''] : draft.options,
    })
  }

  const canSave =
    draft.question_text.trim().length > 0 &&
    (!hasOptions(draft.question_type) ||
      draft.options.filter((option) => option.trim().length > 0).length >= 1)

  return (
    <div className="card stack">
      <div className="row row--between">
        <span className="badge">질문 {index + 1}</span>
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0 || draft.id === null}
            aria-label="위로 이동"
          >
            ↑
          </button>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1 || draft.id === null}
            aria-label="아래로 이동"
          >
            ↓
          </button>
          <button className="btn btn--sm btn--danger" type="button" onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor={`q-text-${index}`}>
          질문 내용
        </label>
        <input
          id={`q-text-${index}`}
          className="input"
          value={draft.question_text}
          onChange={(e) => update({ question_text: e.target.value })}
          placeholder="예) 학부모님 연락처를 적어주세요"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`q-type-${index}`}>
          응답 형식
        </label>
        <select
          id={`q-type-${index}`}
          className="select"
          value={draft.question_type}
          onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
        >
          {TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {hasOptions(draft.question_type) && (
        <OptionListEditor
          options={draft.options}
          onChange={(options) => update({ options })}
        />
      )}

      {draft.dirty && (
        <div className="row row--between">
          <span className="tiny">저장하지 않은 변경사항이 있습니다.</span>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
}
