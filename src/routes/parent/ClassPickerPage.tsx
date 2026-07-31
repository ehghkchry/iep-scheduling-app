import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { parentGetEventContext, parentListClasses } from '../../lib/rpc'
import type { ParentClass, ParentEventContext } from '../../lib/types'

/** 학부모가 링크로 처음 만나는 화면. 반 목록만 보여준다. */
export default function ClassPickerPage() {
  const { eventToken = '' } = useParams<{ eventToken: string }>()

  const [context, setContext] = useState<ParentEventContext | null>(null)
  const [classes, setClasses] = useState<ParentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const ctx = await parentGetEventContext(eventToken)
        if (cancelled) return
        if (!ctx) {
          setInvalid(true)
          return
        }
        setContext(ctx)
        const rows = await parentListClasses(eventToken)
        if (!cancelled) setClasses(rows)
      } catch {
        if (!cancelled) setInvalid(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [eventToken])

  if (loading) {
    return (
      <div className="page page--narrow">
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
            주소가 잘못되었거나 협의회가 종료되었습니다. 학교에서 받으신 링크를 다시 확인해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>{context.title}</h1>
        {context.description && <p className="muted">{context.description}</p>}
      </div>

      <div className="stack">
        <h2>자녀의 반을 선택해 주세요</h2>

        {classes.length === 0 ? (
          <div className="empty">아직 등록된 반이 없습니다. 학교로 문의해 주세요.</div>
        ) : (
          classes.map((classRow) => (
            <Link
              key={classRow.class_id}
              className="card event-card"
              to={`/event/${eventToken}/class/${classRow.class_id}`}
            >
              <h3>{classRow.class_name}</h3>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
