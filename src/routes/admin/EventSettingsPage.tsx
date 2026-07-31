import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useEventContext } from './EventLayout'
import EventForm from '../../components/EventForm'
import type { EventFormValues } from '../../components/EventForm'
import ExcludedDatesEditor from '../../components/ExcludedDatesEditor'

export default function EventSettingsPage() {
  const { event, reloadEvent } = useEventContext()
  const navigate = useNavigate()

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [savingDate, setSavingDate] = useState(false)

  const loadExcludedDates = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('event_excluded_dates')
      .select('excluded_date')
      .eq('event_id', event.id)
      .order('excluded_date')

    if (queryError) setError(queryError.message)
    else setExcludedDates((data ?? []).map((row) => row.excluded_date as string))
  }, [event.id])

  useEffect(() => {
    void loadExcludedDates()
  }, [loadExcludedDates])

  async function handleSubmit(values: EventFormValues) {
    setSaved(false)
    const { error: updateError } = await supabase
      .from('events')
      .update({
        title: values.title,
        description: values.description || null,
        date_range_start: values.date_range_start,
        date_range_end: values.date_range_end,
        daily_start_time: values.daily_start_time,
        daily_end_time: values.daily_end_time,
        slot_duration_minutes: values.slot_duration_minutes,
        break_minutes: values.break_minutes,
        include_weekends: values.include_weekends,
      })
      .eq('id', event.id)

    if (updateError) throw new Error(updateError.message)
    await reloadEvent()
    setSaved(true)
  }

  async function handleToggleDate(date: string, excluded: boolean) {
    setError(null)
    setSavingDate(true)

    const { error: writeError } = excluded
      ? await supabase.from('event_excluded_dates').insert({ event_id: event.id, excluded_date: date })
      : await supabase
          .from('event_excluded_dates')
          .delete()
          .eq('event_id', event.id)
          .eq('excluded_date', date)

    if (writeError) setError(writeError.message)
    else await loadExcludedDates()
    setSavingDate(false)
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `'${event.title}'을(를) 삭제하면 반, 질문, 학부모 응답이 모두 함께 지워집니다. 되돌릴 수 없습니다. 삭제할까요?`,
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id)
    if (deleteError) setError(deleteError.message)
    else navigate('/admin', { replace: true })
  }

  return (
    <div className="stack stack--lg">
      <section className="stack stack--sm">
        <h2>협의회 설정</h2>
        <p className="muted">
          날짜나 시간대를 바꾸면 시간표 모양이 달라집니다. 이미 제출된 응답은 그대로 남지만, 바뀐
          범위 밖의 시간은 시간표에서 보이지 않게 되니 주의해 주세요.
        </p>
      </section>

      {error && <div className="alert alert--error">{error}</div>}
      {saved && <div className="alert alert--success">저장했습니다.</div>}

      <EventForm
        submitLabel="저장"
        onSubmit={handleSubmit}
        excludedDates={excludedDates}
        initial={{
          title: event.title,
          description: event.description ?? '',
          date_range_start: event.date_range_start,
          date_range_end: event.date_range_end,
          daily_start_time: event.daily_start_time,
          daily_end_time: event.daily_end_time,
          slot_duration_minutes: event.slot_duration_minutes,
          break_minutes: event.break_minutes,
          include_weekends: event.include_weekends,
        }}
      />

      <ExcludedDatesEditor
        event={event}
        excludedDates={excludedDates}
        saving={savingDate}
        onToggle={(date, excluded) => void handleToggleDate(date, excluded)}
      />

      <section className="card stack stack--sm">
        <h3>협의회 삭제</h3>
        <p className="muted">반, 질문, 학부모 응답이 모두 함께 지워집니다. 되돌릴 수 없습니다.</p>
        <button
          className="btn btn--danger"
          type="button"
          onClick={handleDelete}
          style={{ alignSelf: 'flex-start' }}
        >
          이 협의회 삭제
        </button>
      </section>
    </div>
  )
}
