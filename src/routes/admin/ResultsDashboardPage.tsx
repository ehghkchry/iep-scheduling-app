import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useEventContext } from './EventLayout'
import { formatSlotLabel, generateSlotGrid, slotKey } from '../../lib/slots'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
import AnswerList from '../../components/AnswerList'
import type { AnswerView, ClassRow, QuestionType } from '../../lib/types'

interface BookingRecord {
  id: string
  class_id: string
  student_name: string
  slot_date: string
  slot_start_time: string
  answers: AnswerView[]
}

/** PostgREST가 중첩 select로 돌려주는 모양 */
interface RawBooking {
  id: string
  class_id: string
  student_name: string
  slot_date: string
  slot_start_time: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [classResult, bookingResult, blockedResult] = await Promise.all([
        supabase.from('classes').select('*').eq('event_id', event.id).order('name'),
        supabase
          .from('bookings')
          .select(
            'id, class_id, student_name, slot_date, slot_start_time,' +
              ' answers(value, questions(question_text, question_type, order_index))',
          )
          .eq('event_id', event.id)
          .order('slot_date')
          .order('slot_start_time'),
        supabase.from('unavailable_slots').select('class_id, slot_date, slot_start_time'),
      ])

      if (classResult.error) throw new Error(classResult.error.message)
      if (bookingResult.error) throw new Error(bookingResult.error.message)
      if (blockedResult.error) throw new Error(blockedResult.error.message)

      const classRows = (classResult.data ?? []) as ClassRow[]
      setClasses(classRows)
      setSelectedClassId((prev) => prev || classRows[0]?.id || '')

      // 중첩 select는 supabase-js가 타입을 좁히지 못해 직접 형을 지정한다
      setBookings(
        ((bookingResult.data ?? []) as unknown as RawBooking[]).map((row) => ({
          id: row.id,
          class_id: row.class_id,
          student_name: row.student_name,
          slot_date: row.slot_date,
          slot_start_time: row.slot_start_time,
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

  const grid = useMemo(() => generateSlotGrid(event), [event])

  const classBookings = useMemo(
    () => bookings.filter((booking) => booking.class_id === selectedClassId),
    [bookings, selectedClassId],
  )

  const namesByKey = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const booking of classBookings) {
      const key = slotKey(booking.slot_date, booking.slot_start_time)
      map.set(key, [...(map.get(key) ?? []), booking.student_name])
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
        />
      </section>

      <section className="stack">
        <h3>제출한 내용 ({classBookings.length}건)</h3>

        {classBookings.length === 0 ? (
          <div className="empty">이 반은 아직 제출한 학부모님이 없습니다.</div>
        ) : (
          classBookings.map((booking) => (
            <div key={booking.id} className="card stack stack--sm">
              <div className="row row--between">
                <h3>{booking.student_name}</h3>
                <span className="badge">
                  {formatSlotLabel(booking.slot_date, booking.slot_start_time)}
                </span>
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
