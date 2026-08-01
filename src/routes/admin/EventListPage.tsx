import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { formatDateLong, formatTimeLabel } from '../../lib/slots'
import { createPracticeEvent } from '../../lib/practiceEvent'
import { confirmAndDeleteEvent } from '../../lib/deleteEvent'
import type { EventRow } from '../../lib/types'

export default function EventListPage() {
  const navigate = useNavigate()

  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creatingPractice, setCreatingPractice] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) setError(queryError.message)
    else setEvents(data as EventRow[])
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  async function handleDelete(event: EventRow) {
    setError(null)
    setDeletingId(event.id)
    try {
      if (await confirmAndDeleteEvent(event)) await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : '협의회를 지우지 못했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  /**
   * 연습용은 입력받을 게 없으므로 폼 없이 바로 만들고, 반 관리 화면으로 데려간다.
   * 거기에 담임 링크와 학부모 화면 테스트 버튼이 모두 준비되어 있다.
   */
  async function handleCreatePractice() {
    setError(null)
    setCreatingPractice(true)
    try {
      const eventId = await createPracticeEvent()
      navigate(`/admin/events/${eventId}/classes`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '연습용 협의회를 만들지 못했습니다.')
      setCreatingPractice(false)
    }
  }

  const practiceButton = (
    <button
      className="btn"
      type="button"
      onClick={() => void handleCreatePractice()}
      disabled={creatingPractice}
    >
      {creatingPractice ? '만드는 중…' : '연습용으로 하나 만들어 보기'}
    </button>
  )

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
        <div className="empty stack">
          <div>
            아직 만든 협의회가 없습니다.
            <br />
            <strong>새로 만들기</strong>를 눌러 시작해 보세요.
          </div>
          <div>
            처음이시라면 연습용을 먼저 만들어 보셔도 됩니다. 반과 질문까지 채워진 협의회가 바로
            생기고, 지우셔도 아무 문제 없습니다.
          </div>
          <div>{practiceButton}</div>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="stack stack--lg">
          <div className="stack">
            {/* 삭제 버튼은 링크 안에 넣을 수 없어(누를 곳이 겹친다) 카드를 감싸고 나란히 둔다 */}
            {events.map((event) => (
              <div key={event.id} className="card event-row">
                <Link className="event-row__main" to={`/admin/events/${event.id}`}>
                  <h2>{event.title}</h2>
                  <p className="muted">
                    {formatDateLong(event.date_range_start)}
                    {event.date_range_start !== event.date_range_end &&
                      ` ~ ${formatDateLong(event.date_range_end)}`}
                  </p>
                  <p className="tiny">
                    매일 {formatTimeLabel(event.daily_start_time)}~
                    {formatTimeLabel(event.daily_end_time)} · 한 번에{' '}
                    {event.slot_duration_minutes}분
                    {event.break_minutes > 0 && ` (쉬는 시간 ${event.break_minutes}분)`}
                  </p>
                </Link>
                <button
                  className="btn btn--sm btn--danger"
                  type="button"
                  onClick={() => void handleDelete(event)}
                  disabled={deletingId === event.id}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="stack stack--sm">
            <p className="tiny">
              학부모가 되어 신청해 보고 결과가 어떻게 나오는지 확인하고 싶으실 때 쓰세요. 반과
              질문까지 채워진 연습용 협의회가 바로 생기고, 끝나면 통째로 지우시면 됩니다.
            </p>
            <div>{practiceButton}</div>
          </div>
        </div>
      )}
    </div>
  )
}
