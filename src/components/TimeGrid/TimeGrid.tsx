import { useEffect, useRef, useState } from 'react'
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
  /** 마감된 칸 (담임교사가 막은 것과 관리교사가 막은 것을 모두 포함) */
  blockedKeys?: Set<string>
  /**
   * 그중 관리교사가 협의회 전체에 걸어둔 칸. 담임교사는 누를 수 없고,
   * 담임이 스스로 막은 칸과 구분해서 보여준다.
   */
  lockedKeys?: Set<string>
  /** parent-select에서 현재 고른 칸들 */
  selectedKeys?: Set<string>
  /** teacher-results에서 칸마다 보여줄 학생 이름들 */
  namesByKey?: Map<string, string[]>
  /** 학생마다 다른 색. 한 학생이 고른 여러 칸을 눈으로 따라가기 쉽게 해준다. */
  colorByName?: Map<string, string>
  /** admin-overlay에서 칸마다 보여줄 신청 건수 */
  countsByKey?: Map<string, number>
  onToggleBlocked?: (date: string, time: string) => void
  onSelect?: (date: string, time: string) => void
  /**
   * teacher-results에서 이름 옆에 ✕를 달아, 그 학생의 이 시간대를 뺄 수 있게 한다.
   * 넘기지 않으면 ✕가 아예 그려지지 않는다 — 담임 화면은 읽기만 하는 곳이라 넘기지 않는다.
   */
  onRemoveName?: (date: string, time: string, name: string) => void
  /** 저장 중일 때 조작을 막는다 */
  busy?: boolean
}

export default function TimeGrid({
  grid,
  mode,
  blockedKeys,
  lockedKeys,
  selectedKeys,
  namesByKey,
  colorByName,
  countsByKey,
  onToggleBlocked,
  onSelect,
  onRemoveName,
  busy = false,
}: TimeGridProps) {
  /*
   * 가로로 얼마나 남았는지 알려주는 막대.
   *
   * 후보 기간이 길면 날짜 열이 화면을 넘치는데, 휴대폰은 손을 대기 전까지 스크롤 막대를
   * 감춰버린다. 그래서 오른쪽에 날짜가 더 있다는 걸 눈치채지 못한 채 넘어가게 된다.
   * 표 아래에 항상 보이는 막대를 두어, 지금 전체 중 어디쯤을 보고 있는지 알려준다.
   */
  const scrollRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ shown: 1, from: 0 })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function measure() {
      if (!el) return
      const total = el.scrollWidth
      if (total <= 0) return
      setView({ shown: el.clientWidth / total, from: el.scrollLeft / total })
    }

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // 화면을 돌리거나 창을 줄이면 보이는 폭이 달라진다
    const observer = new ResizeObserver(measure)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [grid.dates.length, grid.times.length])

  if (grid.dates.length === 0 || grid.times.length === 0) {
    return <div className="empty">보여드릴 시간표가 없습니다. 협의회 설정을 확인해 주세요.</div>
  }

  const interactive = mode === 'teacher-edit' || mode === 'parent-select'
  // 소수점 오차로 막대가 깜빡이지 않도록 아주 살짝 여유를 둔다
  const overflows = view.shown < 0.995

  return (
    <div className="time-grid-wrap">
      <div ref={scrollRef} className={`time-grid-scroll time-grid--${mode}`}>
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
                  끝 시각은 항상 적는다. 쉬는 시간이 없으면 아랫줄 시작 시각이 곧 이 칸의
                  끝이라 생략할 수도 있지만, 그건 읽는 사람에게 계산을 시키는 일이다.
                  상담 시간표는 "몇 시부터 몇 시까지"가 한 줄에서 읽혀야 한다.
                */}
                <th className="time-grid__time" scope="row">
                  <span className="time-grid__time-start">{formatTimeLabel(time)}</span>
                  <span className="time-grid__time-end">
                    ~{slotEndLabel(time, grid.durationMinutes)}
                  </span>
                </th>

                {grid.dates.map((date) => {
                  const key = slotKey(date, time)
                  const blocked = blockedKeys?.has(key) ?? false
                  const locked = lockedKeys?.has(key) ?? false
                  const selected = selectedKeys?.has(key) ?? false
                  const names = namesByKey?.get(key) ?? []
                  const count = countsByKey?.get(key) ?? 0

                  const classNames = [
                    'time-grid__cell',
                    blocked ? 'time-grid__cell--blocked' : '',
                    locked ? 'time-grid__cell--locked' : '',
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
                                  <span
                                    key={i}
                                    className="time-grid__name"
                                    style={
                                      colorByName?.get(name)
                                        ? ({
                                            '--student-color': colorByName.get(name),
                                          } as React.CSSProperties)
                                        : undefined
                                    }
                                  >
                                    {name}
                                    {onRemoveName && (
                                      <button
                                        type="button"
                                        className="time-grid__name-remove"
                                        aria-label={`${formatDateLabel(date)} ${formatTimeLabel(time)} ${name} 학생 신청 빼기`}
                                        disabled={busy}
                                        onClick={() => onRemoveName(date, time, name)}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </span>
                            ) : blocked ? (
                              <span className="time-grid__label" role="img" aria-label="마감">
                                ✕
                              </span>
                            ) : null)}

                          {mode === 'admin-overlay' &&
                            (count > 0 ? (
                              <span className="time-grid__count">{count}</span>
                            ) : blocked ? (
                              <span className="time-grid__label" role="img" aria-label="마감">
                                ✕
                              </span>
                            ) : null)}
                        </div>
                      </td>
                    )
                  }

                  const isTeacherEdit = mode === 'teacher-edit'
                  const slotName = `${formatDateLabel(date)} ${formatTimeLabel(time)}`
                  /*
                   * 칸 안은 기호만 남으므로, 무슨 칸인지는 이 설명이 대신 읽어준다.
                   *
                   * 학부모 화면에서는 시간대만 읽어준다. 고른 상태인지는 아래 aria-checked가
                   * 이미 "체크됨"으로 알려주기 때문에, 여기에 '선택'까지 적으면 한 칸을 두고
                   * "체크됨, 8월 5일 11:00 선택 해제"처럼 겹쳐 읽힌다.
                   */
                  const label = isTeacherEdit
                    ? locked
                      ? `${slotName} 관리 선생님이 막은 시간`
                      : `${slotName} ${blocked ? '마감 해제' : '마감하기'}`
                    : blocked
                      ? `${slotName} 마감`
                      : slotName

                  return (
                    <td key={key} className="time-grid__cell-wrap">
                      <button
                        type="button"
                        className={classNames}
                        aria-label={label}
                        /*
                         * 담임은 칸을 "눌러서 막는" 것이라 토글 버튼이고,
                         * 학부모는 원하는 시간을 "골라 담는" 것이라 체크박스다.
                         * 겉모습이 네모칸인데 스크린리더가 "버튼"이라 읽으면 서로 어긋난다.
                         */
                        role={isTeacherEdit ? undefined : 'checkbox'}
                        aria-pressed={isTeacherEdit ? blocked : undefined}
                        aria-checked={isTeacherEdit ? undefined : selected}
                        disabled={busy || locked || (!isTeacherEdit && blocked)}
                        onClick={() =>
                          isTeacherEdit ? onToggleBlocked?.(date, time) : onSelect?.(date, time)
                        }
                      >
                        {isTeacherEdit ? (
                          <span className="time-grid__label">
                            {locked ? '잠김' : blocked ? '✕' : '가능'}
                          </span>
                        ) : blocked ? (
                          <span className="time-grid__label">✕</span>
                        ) : (
                          // 눈으로 보는 몫만 맡는다. 체크 여부는 위의 aria-checked가 읽어준다.
                          <span className="time-grid__box" aria-hidden="true" />
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

      {overflows && (
        <div className="time-grid-bar">
          <div
            className="time-grid-bar__seen"
            style={{ width: `${view.shown * 100}%`, marginLeft: `${view.from * 100}%` }}
          />
        </div>
      )}
      {overflows && (
        <p className="time-grid-hint">← 좌우로 밀면 다른 날짜를 볼 수 있습니다 →</p>
      )}
    </div>
  )
}
