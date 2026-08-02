import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

/** 시간표 격자를 만드는 데 필요한 행사 설정 */
export interface SlotGridConfig {
  date_range_start: string
  date_range_end: string
  daily_start_time: string
  daily_end_time: string
  /** 협의회 한 건에 걸리는 시간 */
  slot_duration_minutes: number
  /** 협의회 사이에 두는 여유 시간. 0이면 칸이 빈틈없이 붙는다. */
  break_minutes: number
  /** 학교는 보통 주말에 쉬므로 기본은 제외 */
  include_weekends?: boolean
  /** 공휴일·재량휴업일 등 관리교사가 직접 뺀 날짜 ('YYYY-MM-DD') */
  excluded_dates?: string[]
}

export interface SlotGrid {
  /** 열: 'YYYY-MM-DD' */
  dates: string[]
  /** 행: 'HH:MM:SS' */
  times: string[]
  /** 한 칸이 실제로 차지하는 길이(분). 끝 시각을 계산하는 데 쓴다. */
  durationMinutes: number
}

/** 행사 정보를 아직 못 받았을 때 쓰는 빈 격자 */
export const EMPTY_SLOT_GRID: SlotGrid = {
  dates: [],
  times: [],
  durationMinutes: 0,
}

/** DB의 time 값은 'HH:MM:SS'로 오지만 폼 input은 'HH:MM'을 쓴다. 하나로 맞춘다. */
export function normalizeTime(time: string): string {
  const [h = '00', m = '00', s = '00'] = time.split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
}

/** 격자 칸 하나를 가리키는 키. 담임교사/학부모/관리자 화면이 모두 이 키로 데이터를 얹는다. */
export function slotKey(date: string, time: string): string {
  return `${date}T${normalizeTime(time)}`
}

function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':')
  return Number(h) * 60 + Number(m)
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

/**
 * 행사 설정에서 날짜 × 시간 격자를 만든다.
 *
 * 칸의 시작 간격은 "상담 길이 + 쉬는 시간"이고, 마지막 칸은 상담이 종료 시각을
 * 넘지 않을 때까지만 만든다.
 * 예) 14:10~16:30, 20분 상담 + 10분 휴식
 *     → 14:10, 14:40, 15:10, 15:40, 16:10 (각 칸은 20분간 진행)
 */
export function generateSlotGrid(config: SlotGridConfig): SlotGrid {
  const excluded = new Set(config.excluded_dates ?? [])

  const dates = eachDayOfInterval({
    start: parseISO(config.date_range_start),
    end: parseISO(config.date_range_end),
  })
    .filter((d) => {
      // 학교가 쉬는 날은 아예 열을 만들지 않는다
      const weekday = d.getDay()
      const isWeekend = weekday === 0 || weekday === 6
      if (isWeekend && !config.include_weekends) return false
      return !excluded.has(format(d, 'yyyy-MM-dd'))
    })
    .map((d) => format(d, 'yyyy-MM-dd'))

  const times: string[] = []
  const start = timeToMinutes(config.daily_start_time)
  const end = timeToMinutes(config.daily_end_time)
  const duration = config.slot_duration_minutes
  const breakMinutes = config.break_minutes ?? 0
  const step = duration + breakMinutes

  if (duration > 0 && step > 0) {
    for (let m = start; m + duration <= end; m += step) {
      times.push(minutesToTime(m))
    }
  }

  return { dates, times, durationMinutes: duration }
}

/** 시작 시각에 상담 길이를 더한 끝 시각. '14:10' + 20분 → '14:30' */
export function slotEndLabel(time: string, durationMinutes: number): string {
  return formatTimeLabel(minutesToTime(timeToMinutes(time) + durationMinutes))
}

/** '7/31(금)' */
export function formatDateLabel(date: string): string {
  return format(parseISO(date), 'M/d(E)', { locale: ko })
}

/** 시간표 머리행을 두 줄('7/31' + '금')로 그리기 위한 정보 */
export interface DayInfo {
  /** '7/31' */
  dayLabel: string
  /** '금' */
  weekdayLabel: string
  isSaturday: boolean
  isSunday: boolean
}

export function getDayInfo(date: string): DayInfo {
  const parsed = parseISO(date)
  const weekday = parsed.getDay()
  return {
    dayLabel: format(parsed, 'M/d'),
    weekdayLabel: format(parsed, 'E', { locale: ko }),
    isSaturday: weekday === 6,
    isSunday: weekday === 0,
  }
}

/** '2026년 7월 31일 (금)' */
export function formatDateLong(date: string): string {
  return format(parseISO(date), 'yyyy년 M월 d일 (E)', { locale: ko })
}

/** '09:00' */
export function formatTimeLabel(time: string): string {
  return normalizeTime(time).slice(0, 5)
}

/** '7/31(금) 09:00' */
export function formatSlotLabel(date: string, time: string): string {
  return `${formatDateLabel(date)} ${formatTimeLabel(time)}`
}
