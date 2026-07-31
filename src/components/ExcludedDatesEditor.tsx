import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { getDayInfo } from '../lib/slots'
import type { EventRow } from '../lib/types'
import './ExcludedDatesEditor.css'

/**
 * 공휴일·재량휴업일처럼 학교가 쉬는 날을 빼는 화면.
 * 공휴일은 해마다 날짜가 달라지고 학교 사정도 제각각이라 자동 판단이 불가능해서,
 * 기간 안의 날짜를 모두 보여주고 직접 끄게 한다.
 */
export default function ExcludedDatesEditor({
  event,
  excludedDates,
  saving,
  onToggle,
}: {
  event: EventRow
  excludedDates: string[]
  saving: boolean
  onToggle: (date: string, excluded: boolean) => void
}) {
  const excluded = new Set(excludedDates)

  const days = eachDayOfInterval({
    start: parseISO(event.date_range_start),
    end: parseISO(event.date_range_end),
  }).map((d) => format(d, 'yyyy-MM-dd'))

  const usedCount = days.filter((date) => {
    const info = getDayInfo(date)
    const isWeekend = info.isSaturday || info.isSunday
    if (isWeekend && !event.include_weekends) return false
    return !excluded.has(date)
  }).length

  return (
    <section className="card stack">
      <div>
        <h3>쉬는 날 빼기</h3>
        <p className="muted" style={{ marginTop: 4 }}>
          공휴일이나 재량휴업일처럼 학교에 나오지 않는 날을 눌러서 빼주세요. 뺀 날은 시간표에 아예
          나오지 않습니다.
        </p>
      </div>

      <div className="day-toggles">
        {days.map((date) => {
          const info = getDayInfo(date)
          const isWeekend = info.isSaturday || info.isSunday
          const autoOff = isWeekend && !event.include_weekends
          const isOff = autoOff || excluded.has(date)

          return (
            <button
              key={date}
              type="button"
              className={`day-toggle ${isOff ? 'day-toggle--off' : ''} ${
                autoOff ? 'day-toggle--auto' : ''
              }`}
              disabled={autoOff || saving}
              onClick={() => onToggle(date, !excluded.has(date))}
              aria-pressed={!isOff}
              title={
                autoOff
                  ? '주말입니다. 포함하시려면 위 설정에서 주말 포함을 켜주세요.'
                  : isOff
                    ? '다시 눌러 되돌리기'
                    : '눌러서 빼기'
              }
            >
              <span className="day-toggle__date">{info.dayLabel}</span>
              <span
                className={`day-toggle__weekday ${
                  info.isSunday ? 'is-sun' : info.isSaturday ? 'is-sat' : ''
                }`}
              >
                {info.weekdayLabel}
              </span>
              {autoOff && <span className="day-toggle__tag">주말</span>}
              {!autoOff && isOff && <span className="day-toggle__tag">쉼</span>}
            </button>
          )
        })}
      </div>

      <p className="tiny">
        협의회를 진행하는 날은 <strong>{usedCount}일</strong>입니다.
      </p>
    </section>
  )
}
