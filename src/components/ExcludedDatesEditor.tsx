import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { getDayInfo } from '../lib/slots'
import './ExcludedDatesEditor.css'

/**
 * 기간 안의 날짜를 모두 늘어놓고, 학교가 쉬는 날을 눌러서 빼는 부분.
 *
 * 공휴일은 해마다 날짜가 달라지고 재량휴업일은 학교마다 달라서 자동 판단이 불가능하다.
 * 그래서 직접 고르게 하되, 협의회를 만드는 화면에 함께 두어 나중에 설정을 찾아
 * 들어가지 않아도 눈에 띄게 했다.
 */
export default function ExcludedDatesEditor({
  dateRangeStart,
  dateRangeEnd,
  includeWeekends,
  excludedDates,
  onChange,
}: {
  dateRangeStart: string
  dateRangeEnd: string
  includeWeekends: boolean
  excludedDates: string[]
  onChange: (next: string[]) => void
}) {
  if (!dateRangeStart || !dateRangeEnd || dateRangeEnd < dateRangeStart) return null

  const excluded = new Set(excludedDates)

  const days = eachDayOfInterval({
    start: parseISO(dateRangeStart),
    end: parseISO(dateRangeEnd),
  }).map((d) => format(d, 'yyyy-MM-dd'))

  const usedCount = days.filter((date) => {
    const info = getDayInfo(date)
    if ((info.isSaturday || info.isSunday) && !includeWeekends) return false
    return !excluded.has(date)
  }).length

  function toggle(date: string) {
    onChange(
      excluded.has(date) ? excludedDates.filter((d) => d !== date) : [...excludedDates, date],
    )
  }

  return (
    <div className="field">
      <span className="label">협의회를 진행할 날짜</span>
      <p className="tiny">
        공휴일이나 학교 행사로 쉬는 날은 눌러서 빼주세요. 뺀 날은 시간표에 나오지 않습니다.
      </p>

      <div className="day-toggles">
        {days.map((date) => {
          const info = getDayInfo(date)
          const isWeekend = info.isSaturday || info.isSunday
          const autoOff = isWeekend && !includeWeekends
          const isOff = autoOff || excluded.has(date)

          return (
            <button
              key={date}
              type="button"
              className={`day-toggle ${isOff ? 'day-toggle--off' : ''} ${
                autoOff ? 'day-toggle--auto' : ''
              }`}
              disabled={autoOff}
              onClick={() => toggle(date)}
              aria-pressed={!isOff}
              title={
                autoOff
                  ? '주말입니다. 포함하시려면 위의 주말 포함을 켜주세요.'
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
    </div>
  )
}
