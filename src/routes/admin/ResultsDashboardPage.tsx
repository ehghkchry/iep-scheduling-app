import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useEventContext } from './EventLayout'
import { formatSlotLabel, generateSlotGrid, slotKey } from '../../lib/slots'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
import AnswerList from '../../components/AnswerList'
import { buildStudentColorMap } from '../../lib/studentColors'
import type { AnswerView, ClassRow, QuestionType } from '../../lib/types'

interface BookingRecord {
  id: string
  class_id: string
  student_name: string
  slots: { slot_date: string; slot_start_time: string }[]
  answers: AnswerView[]
}

/** PostgREST가 중첩 select로 돌려주는 모양 */
interface RawBooking {
  id: string
  class_id: string
  student_name: string
  created_at: string
  booking_slots: { slot_date: string; slot_start_time: string }[]
  answers: {
    value: string | string[]
    questions: { question_text: string; question_type: QuestionType; order_index: number } | null
  }[]
}

export default function ResultsDashboardPage() {
  const { event } = useEventContext()

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [blockedKeysByClass, setBlockedKeysByClass] = useState<Map<string, Set<string>>>(new Map())
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [classResult, bookingResult, blockedResult, excludedResult] = await Promise.all([
        supabase.from('classes').select('*').eq('event_id', event.id).order('name'),
        supabase
          .from('bookings')
          .select(
            'id, class_id, student_name, created_at,' +
              ' booking_slots(slot_date, slot_start_time),' +
              ' answers(value, questions(question_text, question_type, order_index))',
          )
          .eq('event_id', event.id)
          .order('created_at'),
        supabase.from('unavailable_slots').select('class_id, slot_date, slot_start_time'),
        supabase.from('event_excluded_dates').select('excluded_date').eq('event_id', event.id),
      ])

      if (classResult.error) throw new Error(classResult.error.message)
      if (bookingResult.error) throw new Error(bookingResult.error.message)
      if (blockedResult.error) throw new Error(blockedResult.error.message)
      if (excludedResult.error) throw new Error(excludedResult.error.message)

      setExcludedDates((excludedResult.data ?? []).map((row) => row.excluded_date as string))

      const classRows = (classResult.data ?? []) as ClassRow[]
      setClasses(classRows)
      setSelectedClassId((prev) => prev || classRows[0]?.id || '')

      // 중첩 select는 supabase-js가 타입을 좁히지 못해 직접 형을 지정한다
      setBookings(
        ((bookingResult.data ?? []) as unknown as RawBooking[]).map((row) => ({
          id: row.id,
          class_id: row.class_id,
          student_name: row.student_name,
          slots: [...(row.booking_slots ?? [])].sort((a, b) =>
            `${a.slot_date}T${a.slot_start_time}`.localeCompare(
              `${b.slot_date}T${b.slot_start_time}`,
            ),
          ),
          answers: row.answers
            .filter((answer) => answer.questions !== null)
            .sort((a, b) => (a.questions!.order_index ?? 0) - (b.questions!.order_index ?? 0))
            .map((answer) => ({
              question_text: answer.questions!.question_text,
              question_type: answer.questions!.question_type,
              value: answer.value,
            })),
        })),
      )

      // RLS가 이미 내 행사로 걸러주지만, 이 화면에서는 이 행사의 반만 쓴다
      const classIds = new Set(classRows.map((row) => row.id))
      const map = new Map<string, Set<string>>()
      for (const slot of blockedResult.data ?? []) {
        if (!classIds.has(slot.class_id)) continue
        const key = slotKey(slot.slot_date, slot.slot_start_time)
        map.set(slot.class_id, (map.get(slot.class_id) ?? new Set()).add(key))
      }
      setBlockedKeysByClass(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    void load()
  }, [load])

  const grid = useMemo(
    () => generateSlotGrid({ ...event, excluded_dates: excludedDates }),
    [event, excludedDates],
  )

  const classBookings = useMemo(
    () => bookings.filter((booking) => booking.class_id === selectedClassId),
    [bookings, selectedClassId],
  )

  // 제출 순서대로 색을 배정해, 시간표와 아래 목록에서 같은 학생이 같은 색을 갖는다
  const colorByName = useMemo(
    () => buildStudentColorMap(classBookings.map((b) => b.student_name)),
    [classBookings],
  )

  // 한 학생이 희망한 시간대마다 이름이 나타난다
  const namesByKey = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const booking of classBookings) {
      for (const slot of booking.slots) {
        const key = slotKey(slot.slot_date, slot.slot_start_time)
        map.set(key, [...(map.get(key) ?? []), booking.student_name])
      }
    }
    return map
  }, [classBookings])

  if (loading) return <p className="muted">불러오는 중…</p>
  if (error) return <div className="alert alert--error">{error}</div>

  if (classes.length === 0) {
    return (
      <div className="empty">
        아직 만든 반이 없습니다.
        <br />
        <Link to={`/admin/events/${event.id}/classes`}>반 관리</Link>에서 먼저 반을 만들어 주세요.
      </div>
    )
  }

  return (
    <div className="stack stack--lg">
      <section className="stack stack--sm">
        <h2>제출 현황</h2>
        <p className="muted">
          전체 {bookings.length}건이 제출되었습니다. 반별로 나눠서 볼 수 있습니다.
        </p>
      </section>

      <div className="field" style={{ maxWidth: 280 }}>
        <label className="label" htmlFor="class-filter">
          반 선택
        </label>
        <select
          id="class-filter"
          className="select"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classes.map((classRow) => {
            const count = bookings.filter((b) => b.class_id === classRow.id).length
            return (
              <option key={classRow.id} value={classRow.id}>
                {classRow.name} ({count}건)
              </option>
            )
          })}
        </select>
      </div>

      <section className="stack">
        <h3>시간표로 보기</h3>
        <TimeGrid
          grid={grid}
          mode="teacher-results"
          blockedKeys={blockedKeysByClass.get(selectedClassId)}
          namesByKey={namesByKey}
          colorByName={colorByName}
        />
      </section>

      <section className="stack">
        <h3>제출한 내용 ({classBookings.length}건)</h3>

        {classBookings.length === 0 ? (
          <div className="empty">이 반은 아직 제출한 학부모님이 없습니다.</div>
        ) : (
          classBookings.map((booking) => (
            <div
              key={booking.id}
              className="card stack stack--sm student-card"
              style={
                { '--student-color': colorByName.get(booking.student_name) } as React.CSSProperties
              }
            >
              <h3>{booking.student_name}</h3>
              <div>
                <p className="answer-label">희망 시간대 ({booking.slots.length}개)</p>
                <div className="row" style={{ gap: 5, marginTop: 4 }}>
                  {booking.slots.map((slot) => (
                    <span
                      key={`${slot.slot_date}T${slot.slot_start_time}`}
                      className="badge badge--slot"
                    >
                      {formatSlotLabel(slot.slot_date, slot.slot_start_time)}
                    </span>
                  ))}
                </div>
              </div>
              <hr className="divider" />
              <AnswerList answers={booking.answers} />
            </div>
          ))
        )}
      </section>
    </div>
  )
}
