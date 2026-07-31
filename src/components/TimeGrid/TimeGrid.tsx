import { formatDateLabel, formatTimeLabel, slotKey } from '../../lib/slots'
import type { SlotGrid } from '../../lib/slots'
import './TimeGrid.css'

export type TimeGridMode =
  /** 담임교사가 칸을 눌러 마감/해제 */
  | 'teacher-edit'
  /** 학부모가 칸 하나를 고름 (마감된 칸은 누를 수 없음) */
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
  /** parent-select에서 현재 고른 칸 */
  selectedKey?: string | null
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
  selectedKey,
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
              시간
            </th>
            {grid.dates.map((date) => (
              <th key={date} scope="col">
                {formatDateLabel(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.times.map((time) => (
            <tr key={time}>
              <th className="time-grid__time" scope="row">
                {formatTimeLabel(time)}
              </th>

              {grid.dates.map((date) => {
                const key = slotKey(date, time)
                const blocked = blockedKeys?.has(key) ?? false
                const selected = selectedKey === key
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

                if (!interactive) {
                  return (
                    <td key={key} className={classNames}>
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
                    </td>
                  )
                }

                const isTeacherEdit = mode === 'teacher-edit'
                const label = isTeacherEdit
                  ? `${formatDateLabel(date)} ${formatTimeLabel(time)} ${blocked ? '마감 해제' : '마감하기'}`
                  : `${formatDateLabel(date)} ${formatTimeLabel(time)} 선택`

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
                      {isTeacherEdit ? (
                        <span className="time-grid__label">{blocked ? '마감' : '가능'}</span>
                      ) : (
                        <span className="time-grid__label">
                          {blocked ? '마감' : selected ? '선택함' : '가능'}
                        </span>
                      )}
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
