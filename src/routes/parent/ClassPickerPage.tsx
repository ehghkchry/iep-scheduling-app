import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { parentGetEventContext, parentListClasses } from '../../lib/rpc'
import { getStoredBookings } from '../../lib/bookingStorage'
import { classFormPath } from '../../lib/parentLinks'
import { isTestMode } from '../../lib/testMode'
import TestModeBanner from '../../components/TestModeBanner'
import type { ParentClass, ParentEventContext } from '../../lib/types'

/** 학부모가 링크로 처음 만나는 화면. 반 목록만 보여준다. */
export default function ClassPickerPage() {
  const { eventToken = '' } = useParams<{ eventToken: string }>()
  const [searchParams] = useSearchParams()
  const testMode = isTestMode(searchParams)

  const [context, setContext] = useState<ParentEventContext | null>(null)
  const [classes, setClasses] = useState<ParentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // 반 목록은 협의회 정보가 없어도 부를 수 있다(둘 다 토큰만 쓴다).
        // 차례로 기다리면 왕복이 두 번이 되고, 서버가 싱가포르에 있어 그만큼 느려진다.
        const [ctx, rows] = await Promise.all([
          parentGetEventContext(eventToken),
          parentListClasses(eventToken),
        ])
        if (cancelled) return
        if (!ctx) {
          setInvalid(true)
          return
        }
        setContext(ctx)
        setClasses(rows)
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
    <>
      {testMode && <TestModeBanner />}

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
            classes.map((classRow) => {
              /*
               * 이 기기로 이미 신청한 반에는 누구를 넣었는지 적어준다.
               * 자녀가 여럿인 학부모가 "셋 다 넣었나"를 반마다 들어가 보지 않고
               * 이 화면에서 바로 확인할 수 있어야 한다.
               */
              const booked = getStoredBookings(classRow.class_id)
              const names = booked.map((b) => b.name).filter(Boolean)

              return (
                <Link
                  key={classRow.class_id}
                  className="card event-card"
                  to={classFormPath(eventToken, classRow.class_id, { testMode })}
                >
                  <h3>{classRow.class_name}</h3>
                  {booked.length > 0 && (
                    <p className="tiny">
                      신청함
                      {names.length > 0 ? `: ${names.join(', ')}` : ` (${booked.length}명)`}
                    </p>
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
