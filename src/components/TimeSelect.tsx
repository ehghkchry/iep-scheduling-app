import { formatTimeLabel } from '../lib/slots'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/**
 * 브라우저 기본 <input type="time">은 위아래로 끝없이 돌아가는 스피너라
 * 원하는 시각을 맞추기 어렵다. 시와 분을 각각 목록에서 고르게 한다.
 * 오전/오후로 나누지 않고 0~23시로 표기한다.
 */
export default function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string
  /** 'HH:MM' 또는 'HH:MM:SS' */
  value: string
  onChange: (next: string) => void
}) {
  const [hourText, minuteText] = formatTimeLabel(value).split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)

  function emit(nextHour: number, nextMinute: number) {
    onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`)
  }

  return (
    <div className="time-select">
      <select
        id={id}
        className="select"
        value={hour}
        onChange={(e) => emit(Number(e.target.value), minute)}
        aria-label="시"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}시
          </option>
        ))}
      </select>

      <select
        className="select"
        value={minute}
        onChange={(e) => emit(hour, Number(e.target.value))}
        aria-label="분"
      >
        {/* 5분 단위. 목록에 없는 값(예: 기존 데이터의 07분)이면 그 값도 함께 보여준다 */}
        {(MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b)).map(
          (m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}분
            </option>
          ),
        )}
      </select>
    </div>
  )
}
