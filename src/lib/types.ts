export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multi_choice'
  | 'dropdown'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: '단답형',
  paragraph: '장문형',
  single_choice: '객관식(하나 선택)',
  multi_choice: '객관식(여러 개 선택)',
  dropdown: '드롭다운',
}

/** 선택지 목록이 필요한 질문 유형 */
export function hasOptions(type: QuestionType): boolean {
  return type === 'single_choice' || type === 'multi_choice' || type === 'dropdown'
}

// ── 테이블 행 (관리교사가 로그인 상태로 직접 다루는 것들) ──────────────

export interface EventRow {
  id: string
  admin_id: string
  title: string
  description: string | null
  /** 'YYYY-MM-DD' */
  date_range_start: string
  date_range_end: string
  /** 'HH:MM:SS' */
  daily_start_time: string
  daily_end_time: string
  slot_duration_minutes: number
  break_minutes: number
  include_weekends: boolean
  parent_access_token: string
  created_at: string
  // 제외 날짜는 event_excluded_dates 테이블에 따로 있다 (여기 없음)
}

export interface ClassRow {
  id: string
  event_id: string
  name: string
  teacher_access_token: string
  created_at: string
}

export interface QuestionRow {
  id: string
  event_id: string
  order_index: number
  question_text: string
  question_type: QuestionType
  created_at: string
}

export interface QuestionOptionRow {
  id: string
  question_id: string
  option_text: string
  order_index: number
}

// ── RPC 반환형 (로그인 없는 담임교사/학부모 경로) ──────────────────────

export interface TeacherContext {
  class_id: string
  class_name: string
  event_id: string
  event_title: string
  event_description: string | null
  date_range_start: string
  date_range_end: string
  daily_start_time: string
  daily_end_time: string
  slot_duration_minutes: number
  break_minutes: number
  include_weekends: boolean
  excluded_dates: string[]
}

export interface SlotRef {
  slot_date: string
  slot_start_time: string
}

/**
 * 담임교사가 받는 마감 칸. `locked`면 관리교사가 협의회 전체에 걸어둔 것이라
 * 담임 선생님은 열 수 없다 (서버도 거절한다).
 */
export interface TeacherBlockedSlot extends SlotRef {
  locked: boolean
}

/** 답변 하나를 사람이 읽을 수 있는 형태로 묶은 것 */
export interface AnswerView {
  question_text: string
  question_type: QuestionType
  value: string | string[]
}

export interface TeacherBooking {
  booking_id: string
  student_name: string
  submitted_at: string
  /** 학부모가 고른 희망 시간대 (여러 개) */
  slots: SlotRef[]
  answers: AnswerView[]
}

export interface ParentEventContext {
  event_id: string
  title: string
  description: string | null
  date_range_start: string
  date_range_end: string
  daily_start_time: string
  daily_end_time: string
  slot_duration_minutes: number
  break_minutes: number
  include_weekends: boolean
  excluded_dates: string[]
}

export interface ParentClass {
  class_id: string
  class_name: string
}

export interface ParentQuestion {
  question_id: string
  question_text: string
  question_type: QuestionType
  order_index: number
  options: string[]
}

export interface BookingView {
  booking_id: string
  student_name: string
  class_name: string
  event_title: string
  /** 학부모에게 "몇 시부터 몇 시까지"를 보여주기 위해 함께 받는다 */
  slot_duration_minutes: number
  submitted_at: string
  /** 본인이 고른 희망 시간대 (여러 개) */
  slots: SlotRef[]
  answers: AnswerView[]
}

/** 학부모가 제출할 때 보내는 답변 한 건 */
export interface AnswerInput {
  question_id: string
  value: string | string[]
}
