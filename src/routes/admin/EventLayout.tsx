import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { formatDateLong, formatTimeLabel } from '../../lib/slots'
import type { EventRow } from '../../lib/types'

interface EventContext {
  event: EventRow
  /** 설정을 저장한 뒤 헤더와 하위 화면을 최신 값으로 다시 그리기 위해 쓴다. */
  reloadEvent: () => Promise<void>
}

/** 하위 탭 화면들이 행사 정보를 받아 쓰는 통로 */
export function useEventContext(): EventContext {
  return useOutletContext<EventContext>()
}

const TABS = [
  { to: 'classes', label: '반 관리' },
  { to: 'questions', label: '질문' },
  { to: 'results', label: '결과' },
  { to: 'settings', label: '설정' },
]

export default function EventLayout() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reloadEvent = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    if (queryError) setError(queryError.message)
    else if (!data) setError('협의회를 찾을 수 없습니다.')
    else setEvent(data as EventRow)
  }, [eventId])

  useEffect(() => {
    void reloadEvent()
  }, [reloadEvent])

  if (error) {
    return (
      <div className="page">
        <div className="alert alert--error">{error}</div>
        <p style={{ marginTop: 16 }}>
          <Link to="/admin">← 목록으로</Link>
        </p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  return (
    <div className="page page--wide">
      <div className="page-header">
        <Link className="tiny" to="/admin">
          ← 목록으로
        </Link>
        <h1>{event.title}</h1>
        <p className="tiny">
          {formatDateLong(event.date_range_start)}
          {event.date_range_start !== event.date_range_end &&
            ` ~ ${formatDateLong(event.date_range_end)}`}
          {' · 매일 '}
          {formatTimeLabel(event.daily_start_time)}~{formatTimeLabel(event.daily_end_time)}
          {` · 한 칸 ${event.slot_duration_minutes}분`}
        </p>
      </div>

      <nav className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ event, reloadEvent } satisfies EventContext} />
    </div>
  )
}
