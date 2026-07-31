import { useState } from 'react'
import type { FormEvent } from 'react'
import { generateSlotGrid, normalizeTime, formatTimeLabel, slotEndLabel } from '../lib/slots'
import TimeSelect from './TimeSelect'

export interface EventFormValues {
  title: string
  description: string
  date_range_start: string
  date_range_end: string
  daily_start_time: string
  daily_end_time: string
  slot_duration_minutes: number
  break_minutes: number
}

const SLOT_DURATIONS = [10, 15, 20, 30, 40, 45, 60, 90]
const BREAK_MINUTES = [0, 5, 10, 15, 20, 30]

/** 행사 만들기와 설정 수정이 같은 입력 항목을 쓰므로 한 곳에 모았다. */
export default function EventForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: EventFormValues
  submitLabel: string
  onSubmit: (values: EventFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<EventFormValues>({
    ...initial,
    daily_start_time: formatTimeLabel(initial.daily_start_time),
    daily_end_time: formatTimeLabel(initial.daily_end_time),
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // 선생님이 설정을 바꿀 때마다 실제로 몇 칸이 생기는지 미리 보여준다
  const preview =
    values.date_range_start && values.date_range_end
      ? generateSlotGrid({
          date_range_start: values.date_range_start,
          date_range_end: values.date_range_end,
          daily_start_time: normalizeTime(values.daily_start_time),
          daily_end_time: normalizeTime(values.daily_end_time),
          slot_duration_minutes: values.slot_duration_minutes,
          break_minutes: values.break_minutes,
        })
      : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (values.date_range_end < values.date_range_start) {
      setError('마지막 날짜가 첫 날짜보다 빠릅니다.')
      return
    }
    if (normalizeTime(values.daily_end_time) <= normalizeTime(values.daily_start_time)) {
      setError('종료 시각이 시작 시각보다 빠르거나 같습니다.')
      return
    }
    if (!preview || preview.times.length === 0) {
      setError('설정한 시간대에 만들 수 있는 칸이 없습니다. 시간대를 넓히거나 칸 길이를 줄여주세요.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
        daily_start_time: normalizeTime(values.daily_start_time),
        daily_end_time: normalizeTime(values.daily_end_time),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="field">
        <label className="label" htmlFor="title">
          협의회 이름<span className="required-mark">*</span>
        </label>
        <input
          id="title"
          className="input"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="예) 2026학년도 1학기 개별화교육지원팀 협의회"
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="description">
          안내 문구
        </label>
        <textarea
          id="description"
          className="textarea"
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="학부모님께 보여드릴 안내 문구를 적어주세요. (선택)"
        />
      </div>

      <hr className="divider" />

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="start-date">
            첫 날짜<span className="required-mark">*</span>
          </label>
          <input
            id="start-date"
            className="input"
            type="date"
            value={values.date_range_start}
            onChange={(e) => update('date_range_start', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="end-date">
            마지막 날짜<span className="required-mark">*</span>
          </label>
          <input
            id="end-date"
            className="input"
            type="date"
            value={values.date_range_end}
            onChange={(e) => update('date_range_end', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="start-time">
            매일 시작 시각<span className="required-mark">*</span>
          </label>
          <TimeSelect
            id="start-time"
            value={values.daily_start_time}
            onChange={(next) => update('daily_start_time', next)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="end-time">
            매일 종료 시각<span className="required-mark">*</span>
          </label>
          <TimeSelect
            id="end-time"
            value={values.daily_end_time}
            onChange={(next) => update('daily_end_time', next)}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="slot-duration">
            한 번에 걸리는 시간<span className="required-mark">*</span>
          </label>
          <select
            id="slot-duration"
            className="select"
            value={values.slot_duration_minutes}
            onChange={(e) => update('slot_duration_minutes', Number(e.target.value))}
          >
            {SLOT_DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}분
              </option>
            ))}
          </select>
          <span className="tiny">협의회 한 건에 걸리는 시간입니다.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="break-minutes">
            쉬는 시간
          </label>
          <select
            id="break-minutes"
            className="select"
            value={values.break_minutes}
            onChange={(e) => update('break_minutes', Number(e.target.value))}
          >
            {BREAK_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? '없음 (칸이 이어짐)' : `${minutes}분`}
              </option>
            ))}
          </select>
          <span className="tiny">협의회와 협의회 사이에 두는 여유 시간입니다.</span>
        </div>
      </div>

      {preview && preview.times.length > 0 && (
        <div className="alert alert--info stack stack--sm">
          <div>
            하루 {preview.times.length}칸 × {preview.dates.length}일 ={' '}
            <strong>총 {preview.times.length * preview.dates.length}칸</strong>이 만들어집니다.
          </div>
          <div className="slot-preview">
            {preview.times.slice(0, 5).map((time) => (
              <span key={time} className="slot-preview__chip">
                {formatTimeLabel(time)}~{slotEndLabel(time, preview.durationMinutes)}
              </span>
            ))}
            {preview.times.length > 5 && (
              <span className="slot-preview__chip slot-preview__chip--more">
                … 외 {preview.times.length - 5}칸
              </span>
            )}
          </div>
        </div>
      )}

      <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
        {submitting ? '저장 중…' : submitLabel}
      </button>
    </form>
  )
}
