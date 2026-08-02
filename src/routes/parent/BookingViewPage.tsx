import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getBookingByAccessToken } from '../../lib/rpc'
import { formatDateLong, formatTimeLabel, slotEndLabel } from '../../lib/slots'
import { getStoredBookings } from '../../lib/bookingStorage'
import { classFormPath, classPickerPath } from '../../lib/parentLinks'
import { isTestMode } from '../../lib/testMode'
import AnswerList from '../../components/AnswerList'
import TestModeBanner from '../../components/TestModeBanner'
import type { BookingView } from '../../lib/types'

/**
 * 제출 직후의 완료 화면이자, 나중에 다시 들어왔을 때 보이는 확인 화면.
 * 수정이나 재제출 수단은 일부러 두지 않는다 — 테스트 모드만 예외다.
 */
export default function BookingViewPage() {
  const { bookingToken = '' } = useParams<{ bookingToken: string }>()
  const [searchParams] = useSearchParams()
  const testMode = isTestMode(searchParams)

  /*
   * 이 화면 주소에는 예약 토큰밖에 없어서, 어느 반에서 왔는지는 앞 화면이 실어 보낸
   * 값으로 안다. 둘 다 있어야 다음 자녀를 신청하러 갈 수 있다.
   *
   * 없을 수도 있다 — 예전에 받은 완료 화면 주소를 즐겨찾기에서 여는 경우다.
   * 그때는 신청 내용만 보여주고 아래 안내는 접는다.
   */
  const eventToken = searchParams.get('event')
  const classId = searchParams.get('class')

  // 이 기기로 이 반에 낸 신청들. 자녀를 몇 명 넣었는지 확인시켜 준다.
  const siblings = classId ? getStoredBookings(classId) : []

  const [booking, setBooking] = useState<BookingView | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    let cancelled = false

    getBookingByAccessToken(bookingToken)
      .then((data) => {
        if (cancelled) return
        if (!data) setInvalid(true)
        else setBooking(data)
      })
      .catch(() => {
        if (!cancelled) setInvalid(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bookingToken])

  if (loading) {
    return (
      <div className="page page--narrow">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  if (invalid || !booking) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>내용을 찾을 수 없습니다</h1>
          <p className="muted">
            주소가 잘못되었거나 제출 내용이 삭제되었습니다. 담임 선생님께 문의해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {testMode && <TestModeBanner />}

      <div className="page page--narrow">
        <div className="stack stack--lg">
          <div className="card stack">
            <div className="submitted-mark">제출 완료</div>
            <h1>{booking.student_name} 학생 신청이 접수되었습니다</h1>
            <p className="muted">
              아래 내용으로 제출되었습니다. 이 화면은 같은 기기에서 링크를 다시 여시면 언제든 볼 수
              있습니다.
            </p>
          </div>

          <section className="card stack">
            <h2>선택하신 시간대 ({booking.slots.length}개)</h2>
            <ul className="chosen-slots">
              {booking.slots.map((slot) => (
                <li key={`${slot.slot_date}T${slot.slot_start_time}`}>
                  <span className="chosen-slots__date">{formatDateLong(slot.slot_date)}</span>
                  <span className="chosen-slots__time">
                    {formatTimeLabel(slot.slot_start_time)} ~{' '}
                    {slotEndLabel(slot.slot_start_time, booking.slot_duration_minutes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="tiny">
              {booking.class_name} · {booking.event_title}
            </p>
            <div className="alert alert--info">
              고르신 시간대 중에서 담임 선생님이 한 시간을 정해 따로 알려드립니다.
            </div>
          </section>

          <section className="card stack">
            <h2>작성하신 내용</h2>
            <div>
              <p className="answer-label">학생 이름</p>
              <p>{booking.student_name}</p>
            </div>
            <hr className="divider" />
            <AnswerList answers={booking.answers} />
          </section>

          <div className="alert alert--info">
            제출한 내용은 고칠 수 없습니다. 수정이 필요하시면 담임 선생님께 말씀해 주세요.
          </div>

          {/*
            특수교육대상 자녀가 둘 이상인 가정이 있다. 형제자매가 같은 반일 때도 있고
            서로 다른 반일 때도 있어서 두 길을 모두 열어둔다. 예전에는 이 화면이
            막다른 길이라, 둘째부터는 문자로 받은 링크를 다시 찾아야 했다.
          */}
          {eventToken && classId && (
            <section className="card stack">
              <h2>자녀가 더 있으신가요?</h2>

              {siblings.length > 0 && (
                <p className="tiny">
                  이 기기로 {booking.class_name}에 신청한 학생:{' '}
                  {siblings.map((s) => s.name).filter(Boolean).join(', ') || '1명'}
                </p>
              )}

              <Link
                className="btn btn--primary btn--block"
                to={classFormPath(eventToken, classId, { testMode, anotherChild: true })}
              >
                {booking.class_name}에 다른 자녀 신청하기
              </Link>
              <Link className="btn btn--block" to={classPickerPath(eventToken, testMode)}>
                다른 반 자녀 신청하기
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
