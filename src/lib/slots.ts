import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

/** 시간표 격자를 만드는 데 필요한 행사 설정 */
export interface SlotGridConfig {
  date_range_start: string
  date_range_end: string
  daily_start_time: string
  daily_end_time: string
  slot_duration_minutes: number
}

export interface SlotGrid {
  /** 열: 'YYYY-MM-DD' */
  dates: string[]
  /** 행: 'HH:MM:SS' */
  times: string[]
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
 * 마지막 칸이 종료 시각을 넘지 않도록 자른다 (09:00~11:00, 30분 → 4칸).
 */
export function generateSlotGrid(config: SlotGridConfig): SlotGrid {
  const dates = eachDayOfInterval({
    start: parseISO(config.date_range_start),
    end: parseISO(config.date_range_end),
  }).map((d) => format(d, 'yyyy-MM-dd'))

  const times: string[] = []
  const start = timeToMinutes(config.daily_start_time)
  const end = timeToMinutes(config.daily_end_time)
  const step = config.slot_duration_minutes

  if (step > 0) {
    for (let m = start; m + step <= end; m += step) {
      times.push(minutesToTime(m))
    }
  }

  return { dates, times }
}

/** '7/31(금)' */
export function formatDateLabel(date: string): string {
  return format(parseISO(date), 'M/d(E)', { locale: ko })
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
