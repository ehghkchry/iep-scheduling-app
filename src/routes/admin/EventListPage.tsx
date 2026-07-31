import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { formatDateLong, formatTimeLabel } from '../../lib/slots'
import type { EventRow } from '../../lib/types'

export default function EventListPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message)
        else setEvents(data as EventRow[])
      })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div className="row row--between">
          <h1>내 협의회</h1>
          <Link className="btn btn--primary" to="/admin/events/new">
            새로 만들기
          </Link>
        </div>
        <p className="muted">직접 만드신 협의회만 보입니다.</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!events && !error && <p className="muted">불러오는 중…</p>}

      {events && events.length === 0 && (
        <div className="empty">
          아직 만든 협의회가 없습니다.
          <br />
          <strong>새로 만들기</strong>를 눌러 시작해 보세요.
        </div>
      )}

      {events && events.length > 0 && (
        <div className="stack">
          {events.map((event) => (
            <Link key={event.id} className="card event-card" to={`/admin/events/${event.id}`}>
              <h2>{event.title}</h2>
              <p className="muted">
                {formatDateLong(event.date_range_start)}
                {event.date_range_start !== event.date_range_end &&
                  ` ~ ${formatDateLong(event.date_range_end)}`}
              </p>
              <p className="tiny">
                매일 {formatTimeLabel(event.daily_start_time)}~
                {formatTimeLabel(event.daily_end_time)} · 한 칸 {event.slot_duration_minutes}분
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
