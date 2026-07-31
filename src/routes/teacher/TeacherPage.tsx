import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  teacherGetBlockedSlots,
  teacherGetBookings,
  teacherGetContext,
  teacherSetSlotBlocked,
} from '../../lib/rpc'
import { formatDateLong, formatSlotLabel, formatTimeLabel, generateSlotGrid, slotKey } from '../../lib/slots'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
import AnswerList from '../../components/AnswerList'
import type { TeacherBooking, TeacherContext } from '../../lib/types'

type Tab = 'availability' | 'results'

export default function TeacherPage() {
  const { classToken = '' } = useParams<{ classToken: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'results' ? 'results' : 'availability'

  const [context, setContext] = useState<TeacherContext | null>(null)
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set())
  const [bookings, setBookings] = useState<TeacherBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const ctx = await teacherGetContext(classToken)
      if (!ctx) {
        setInvalid(true)
        return
      }
      setContext(ctx)

      const [blocked, bookingRows] = await Promise.all([
        teacherGetBlockedSlots(classToken),
        teacherGetBookings(classToken),
      ])
      setBlockedKeys(new Set(blocked.map((s) => slotKey(s.slot_date, s.slot_start_time))))
      setBookings(bookingRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [classToken])

  useEffect(() => {
    void load()
  }, [load])

  const grid = useMemo(() => (context ? generateSlotGrid(context) : { dates: [], times: [] }), [context])

  const namesByKey = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const booking of bookings) {
      const key = slotKey(booking.slot_date, booking.slot_start_time)
      map.set(key, [...(map.get(key) ?? []), booking.student_name])
    }
    return map
  }, [bookings])

  async function handleToggle(date: string, time: string) {
    const key = slotKey(date, time)
    const nextBlocked = !blockedKeys.has(key)

    // 먼저 화면을 바꾸고, 실패하면 되돌린다
    setBlockedKeys((prev) => {
      const next = new Set(prev)
      if (nextBlocked) next.add(key)
      else next.delete(key)
      return next
    })

    setBusy(true)
    setError(null)
    try {
      await teacherSetSlotBlocked(classToken, date, time, nextBlocked)
    } catch (err) {
      setBlockedKeys((prev) => {
        const next = new Set(prev)
        if (nextBlocked) next.delete(key)
        else next.add(key)
        return next
      })
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  if (invalid || !context) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>링크를 확인해 주세요</h1>
          <p className="muted">
            잘못된 주소이거나 협의회가 삭제되었습니다. 받으신 링크를 다시 확인해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--wide">
      <div className="page-header">
        <span className="badge">{context.class_name}</span>
        <h1>{context.event_title}</h1>
        <p className="tiny">
          {formatDateLong(context.date_range_start)}
          {context.date_range_start !== context.date_range_end &&
            ` ~ ${formatDateLong(context.date_range_end)}`}
          {' · 매일 '}
          {formatTimeLabel(context.daily_start_time)}~{formatTimeLabel(context.daily_end_time)}
        </p>
      </div>

      <nav className="tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab ${tab === 'availability' ? 'tab--active' : ''}`}
          onClick={() => setSearchParams({})}
        >
          가능한 시간 정하기
        </button>
        <button
          type="button"
          className={`tab ${tab === 'results' ? 'tab--active' : ''}`}
          onClick={() => setSearchParams({ tab: 'results' })}
        >
          학부모 신청 현황 ({bookings.length})
        </button>
      </nav>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tab === 'availability' ? (
        <div className="stack">
          <div className="alert alert--info">
            처음에는 <strong>모든 시간이 가능</strong>한 상태입니다. 어려운 시간을 눌러 마감해
            주세요. 마감한 시간은 학부모님께 보이지 않습니다.
          </div>

          <TimeGrid
            grid={grid}
            mode="teacher-edit"
            blockedKeys={blockedKeys}
            busy={busy}
            onToggleBlocked={(date, time) => void handleToggle(date, time)}
          />

          <p className="tiny">누르는 즉시 저장됩니다. 나중에 다시 들어와 바꾸셔도 됩니다.</p>
        </div>
      ) : (
        <div className="stack stack--lg">
          <section className="stack">
            <h2>시간표로 보기</h2>
            <p className="muted">
              학부모님이 고른 시간에 학생 이름이 표시됩니다. 같은 시간에 여러 명이 신청했으면 이름이
              함께 보입니다.
            </p>
            <TimeGrid
              grid={grid}
              mode="teacher-results"
              blockedKeys={blockedKeys}
              namesByKey={namesByKey}
            />
          </section>

          <section className="stack">
            <h2>제출한 내용 ({bookings.length}건)</h2>

            {bookings.length === 0 ? (
              <div className="empty">아직 제출한 학부모님이 없습니다.</div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.booking_id} className="card stack stack--sm">
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
      )}
    </div>
  )
}
