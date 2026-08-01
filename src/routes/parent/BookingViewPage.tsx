import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getBookingByAccessToken } from '../../lib/rpc'
import { formatDateLong, formatTimeLabel, slotEndLabel } from '../../lib/slots'
import { isTestMode, withTestMode } from '../../lib/testMode'
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

  // 이 화면 주소에는 예약 토큰밖에 없어서, 되돌아갈 반은 앞 화면이 실어 보낸 값으로 안다
  const backToClass = searchParams.get('event') && searchParams.get('class')
    ? withTestMode(
        `/event/${searchParams.get('event')}/class/${searchParams.get('class')}`,
        testMode,
      )
    : null

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

          {testMode && backToClass && (
            <Link className="btn btn--primary btn--block" to={backToClass}>
              다른 학생으로 또 제출하기
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
