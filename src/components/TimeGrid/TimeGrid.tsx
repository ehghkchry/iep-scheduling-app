import { formatDateLabel, formatTimeLabel, getDayInfo, slotEndLabel, slotKey } from '../../lib/slots'
import type { SlotGrid } from '../../lib/slots'
import './TimeGrid.css'

export type TimeGridMode =
  /** 담임교사가 칸을 눌러 마감/해제 */
  | 'teacher-edit'
  /** 학부모가 가능한 칸을 여러 개 고름 (마감된 칸은 누를 수 없음) */
  | 'parent-select'
  /** 담임교사 결과 화면 — 칸 안에 학생 이름 표시 */
  | 'teacher-results'
  /** 관리자 대시보드 — 칸별 신청 건수 표시 */
  | 'admin-overlay'

interface TimeGridProps {
  grid: SlotGrid
  mode: TimeGridMode
  /** 담임교사가 마감해둔 칸 */
  blockedKeys?: Set<string>
  /** parent-select에서 현재 고른 칸들 */
  selectedKeys?: Set<string>
  /** teacher-results에서 칸마다 보여줄 학생 이름들 */
  namesByKey?: Map<string, string[]>
  /** admin-overlay에서 칸마다 보여줄 신청 건수 */
  countsByKey?: Map<string, number>
  onToggleBlocked?: (date: string, time: string) => void
  onSelect?: (date: string, time: string) => void
  /** 저장 중일 때 조작을 막는다 */
  busy?: boolean
}

export default function TimeGrid({
  grid,
  mode,
  blockedKeys,
  selectedKeys,
  namesByKey,
  countsByKey,
  onToggleBlocked,
  onSelect,
  busy = false,
}: TimeGridProps) {
  if (grid.dates.length === 0 || grid.times.length === 0) {
    return <div className="empty">보여드릴 시간표가 없습니다. 협의회 설정을 확인해 주세요.</div>
  }

  const interactive = mode === 'teacher-edit' || mode === 'parent-select'

  return (
    <div className={`time-grid-scroll time-grid--${mode}`}>
      <table className="time-grid">
        <thead>
          <tr>
            <th className="time-grid__corner" scope="col">
              <span className="time-grid__corner-label">시간</span>
            </th>
            {grid.dates.map((date) => {
              const day = getDayInfo(date)
              return (
                <th
                  key={date}
                  scope="col"
                  className={
                    day.isSunday
                      ? 'time-grid__head time-grid__head--sun'
                      : day.isSaturday
                        ? 'time-grid__head time-grid__head--sat'
                        : 'time-grid__head'
                  }
                >
                  <span className="time-grid__day">{day.dayLabel}</span>
                  <span className="time-grid__weekday">{day.weekdayLabel}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {grid.times.map((time) => (
            <tr key={time}>
              {/*
                쉬는 시간이 있으면 다음 칸 시작 시각으로 끝을 짐작할 수 없으므로
                끝 시각을 함께 적는다. 붙어 있는 경우에는 시작만 보여 폭을 아낀다.
              */}
              <th className="time-grid__time" scope="row">
                <span className="time-grid__time-start">{formatTimeLabel(time)}</span>
                {grid.hasBreak && (
                  <span className="time-grid__time-end">
                    ~{slotEndLabel(time, grid.durationMinutes)}
                  </span>
                )}
              </th>

              {grid.dates.map((date) => {
                const key = slotKey(date, time)
                const blocked = blockedKeys?.has(key) ?? false
                const selected = selectedKeys?.has(key) ?? false
                const names = namesByKey?.get(key) ?? []
                const count = countsByKey?.get(key) ?? 0

                const classNames = [
                  'time-grid__cell',
                  blocked ? 'time-grid__cell--blocked' : '',
                  selected ? 'time-grid__cell--selected' : '',
                  names.length > 0 ? 'time-grid__cell--filled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                // 칸 스타일은 반드시 td 안쪽 요소에 건다.
                // td 자체에 display:flex를 주면 표의 칸 역할을 잃어 열이 어긋난다.
                if (!interactive) {
                  return (
                    <td key={key} className="time-grid__cell-wrap">
                      <div className={classNames}>
                        {mode === 'teacher-results' &&
                          (names.length > 0 ? (
                            <span className="time-grid__names">
                              {names.map((name, i) => (
                                <span key={i} className="time-grid__name">
                                  {name}
                                </span>
                              ))}
                            </span>
                          ) : blocked ? (
                            <span className="time-grid__label">마감</span>
                          ) : null)}

                        {mode === 'admin-overlay' &&
                          (count > 0 ? (
                            <span className="time-grid__count">{count}</span>
                          ) : blocked ? (
                            <span className="time-grid__label">마감</span>
                          ) : null)}
                      </div>
                    </td>
                  )
                }

                const isTeacherEdit = mode === 'teacher-edit'
                const slotName = `${formatDateLabel(date)} ${formatTimeLabel(time)}`
                const label = isTeacherEdit
                  ? `${slotName} ${blocked ? '마감 해제' : '마감하기'}`
                  : `${slotName} ${selected ? '선택 해제' : '선택'}`

                return (
                  <td key={key} className="time-grid__cell-wrap">
                    <button
                      type="button"
                      className={classNames}
                      aria-label={label}
                      aria-pressed={isTeacherEdit ? blocked : selected}
                      disabled={busy || (!isTeacherEdit && blocked)}
                      onClick={() =>
                        isTeacherEdit ? onToggleBlocked?.(date, time) : onSelect?.(date, time)
                      }
                    >
                      <span className="time-grid__label">
                        {isTeacherEdit
                          ? blocked
                            ? '마감'
                            : '가능'
                          : blocked
                            ? '마감'
                            : selected
                              ? '✓ 선택'
                              : '가능'}
                      </span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
