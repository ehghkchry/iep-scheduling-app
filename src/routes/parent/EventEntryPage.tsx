import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { parentGetEventContext, parentListClasses } from '../../lib/rpc'
import { getStoredBookings } from '../../lib/bookingStorage'
import {
  ADD_PARAM,
  SUBMITTED_PARAM,
  bookingViewPath,
  classFormPath,
  eventEntryPath,
} from '../../lib/parentLinks'
import type { ParentClass, ParentEventContext } from '../../lib/types'

interface SubmittedBooking {
  token: string
  name: string | null
  className: string
}

/**
 * 학부모가 링크로 처음 만나는 화면.
 *
 * 이 기기로 낸 신청이 있으면 그 목록을, 없으면 반 선택을 보여준다. 한 화면이 두 모습을
 * 가지는 건 둘이 필요로 하는 값(협의회 정보 + 반 목록)이 똑같아서다. 나누면 같은 것을
 * 두 번 불러오게 된다.
 */
export default function EventEntryPage() {
  const { eventToken = '' } = useParams<{ eventToken: string }>()
  const [searchParams] = useSearchParams()
  const pickClass = searchParams.get(ADD_PARAM) === '1'
  const justSubmitted = searchParams.get(SUBMITTED_PARAM) === '1'

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

  /*
   * 이 기기가 이 협의회에 낸 신청 전부.
   *
   * 저장은 반별로 되어 있어서, 반 목록을 받아온 뒤에야 한자리에 모을 수 있다.
   * 자녀가 서로 다른 반이어도 여기서는 한 목록으로 보인다.
   */
  const submitted = useMemo<SubmittedBooking[]>(
    () =>
      classes.flatMap((classRow) =>
        getStoredBookings(classRow.class_id).map((booking) => ({
          token: booking.token,
          name: booking.name,
          className: classRow.class_name,
        })),
      ),
    [classes],
  )

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

  const showSubmittedList = submitted.length > 0 && !pickClass

  return (
    <>
      <div className="page page--narrow">
        <div className="page-header">
          <h1>{context.title}</h1>
          {context.description && <p className="muted">{context.description}</p>}
        </div>

        {showSubmittedList ? (
          <div className="stack">
            {justSubmitted && (
              <div className="card stack">
                <div className="submitted-mark">제출 완료</div>
                <p className="muted">신청이 접수되었습니다.</p>
              </div>
            )}

            {/* 안내는 목록 앞에 둔다. 뒤에 있으면 다 누르고 나서야 읽게 된다. */}
            <div className="stack stack--sm">
              <h2>신청하신 학생</h2>
              <p className="tiny">이름을 누르면 신청하신 내용을 볼 수 있습니다.</p>
            </div>

            {submitted.map((booking) => (
              <Link
                key={booking.token}
                className="card event-card student-row"
                to={bookingViewPath(booking.token, eventToken)}
              >
                {/*
                  이름이 없는 건 이 목록이 생기기 전에 제출된 것뿐이다. 그때는 토큰만
                  저장했다. 빈 줄을 두느니 무슨 줄인지라도 적어준다.
                */}
                <span className="student-row__name">{booking.name ?? '신청 내용 보기'}</span>
                <span className="student-row__class">{booking.className}</span>
                <span className="student-row__chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}

            <Link
              className="btn btn--primary btn--block"
              to={eventEntryPath(eventToken, { pickClass: true })}
            >
              추가 신청하기
            </Link>
          </div>
        ) : (
          <div className="stack">
            <div className="stack stack--sm">
              <h2>자녀의 반을 선택해 주세요</h2>

              {/*
                아직 아무것도 안 내신 분에게만 알려준다. '추가 신청하기'를 눌러 오신
                분은 방금 그 목록을 보고 왔으므로 이미 아는 이야기다.
              */}
              {submitted.length === 0 && (
                <p className="tiny">
                  <strong>같은 기기에서 이 링크</strong>를 다시 열면{' '}
                  <strong>신청 내용을 확인</strong>하거나 <strong>추가로 신청</strong>하실 수
                  있습니다.
                </p>
              )}
            </div>

            {classes.length === 0 ? (
              <div className="empty">아직 등록된 반이 없습니다. 학교로 문의해 주세요.</div>
            ) : (
              classes.map((classRow) => (
                <Link
                  key={classRow.class_id}
                  className="card event-card"
                  to={classFormPath(eventToken, classRow.class_id)}
                >
                  <h3>{classRow.class_name}</h3>
                </Link>
              ))
            )}

            {submitted.length > 0 && (
              <Link className="btn btn--block" to={eventEntryPath(eventToken)}>
                ← 신청하신 학생 목록으로
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
