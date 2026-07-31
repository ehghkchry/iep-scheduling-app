import { supabase } from './supabaseClient'
import type {
  AnswerInput,
  BookingView,
  ParentClass,
  ParentEventContext,
  ParentQuestion,
  SlotRef,
  TeacherBooking,
  TeacherContext,
} from './types'

/**
 * 담임교사와 학부모는 로그인하지 않는다. URL에 들어 있는 토큰이 곧 인증이며,
 * 원본 테이블은 비로그인 접근이 막혀 있어 아래 RPC로만 데이터를 주고받는다.
 */

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

// ── 담임교사 ────────────────────────────────────────────────────────────

/** 토큰이 유효하지 않으면 null. 화면에서 "잘못된 링크" 안내로 이어진다. */
export async function teacherGetContext(token: string): Promise<TeacherContext | null> {
  const rows = await callRpc<TeacherContext[]>('teacher_get_context', { p_token: token })
  return rows?.[0] ?? null
}

export async function teacherGetBlockedSlots(token: string): Promise<SlotRef[]> {
  return (await callRpc<SlotRef[]>('teacher_get_blocked_slots', { p_token: token })) ?? []
}

export async function teacherSetSlotBlocked(
  token: string,
  slotDate: string,
  slotStartTime: string,
  blocked: boolean,
): Promise<void> {
  await callRpc<null>('teacher_set_slot_blocked', {
    p_token: token,
    p_slot_date: slotDate,
    p_slot_start_time: slotStartTime,
    p_blocked: blocked,
  })
}

export async function teacherGetBookings(token: string): Promise<TeacherBooking[]> {
  return (await callRpc<TeacherBooking[]>('teacher_get_bookings', { p_token: token })) ?? []
}

// ── 학부모 ──────────────────────────────────────────────────────────────

export async function parentGetEventContext(token: string): Promise<ParentEventContext | null> {
  const rows = await callRpc<ParentEventContext[]>('parent_get_event_context', { p_token: token })
  return rows?.[0] ?? null
}

export async function parentListClasses(token: string): Promise<ParentClass[]> {
  return (await callRpc<ParentClass[]>('parent_list_classes', { p_token: token })) ?? []
}

export async function parentGetBlockedSlots(token: string, classId: string): Promise<SlotRef[]> {
  return (
    (await callRpc<SlotRef[]>('parent_get_blocked_slots', {
      p_token: token,
      p_class_id: classId,
    })) ?? []
  )
}

export async function parentGetQuestions(token: string): Promise<ParentQuestion[]> {
  return (await callRpc<ParentQuestion[]>('parent_get_questions', { p_token: token })) ?? []
}

/** 서버가 던지는 예외 코드를 학부모가 읽을 수 있는 문장으로 바꾼다. */
const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  duplicate_student:
    '이미 제출된 학생입니다. 제출 내용 확인이 필요하면 담임 선생님께 문의해 주세요.',
  slot_unavailable: '방금 선택하신 시간은 선생님이 마감한 시간입니다. 다른 시간을 골라주세요.',
  slot_out_of_range: '선택한 시간이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.',
  answers_incomplete: '답하지 않은 질문이 있습니다.',
  student_name_required: '학생 이름을 입력해 주세요.',
  invalid_token_or_class: '잘못된 링크입니다. 선생님께 받은 주소를 다시 확인해 주세요.',
}

export class SubmitBookingError extends Error {
  /** 학생 이름 필드 옆에 표시할 오류인지 구분하는 데 쓴다. */
  readonly code: string

  constructor(code: string) {
    super(SUBMIT_ERROR_MESSAGES[code] ?? '제출하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    this.code = code
  }
}

/** 성공하면 이 예약만의 access_token을 돌려준다. 이 값이 제출 확인 화면의 열쇠다. */
export async function parentSubmitBooking(params: {
  token: string
  classId: string
  studentName: string
  slotDate: string
  slotStartTime: string
  answers: AnswerInput[]
}): Promise<string> {
  const { data, error } = await supabase.rpc('parent_submit_booking', {
    p_token: params.token,
    p_class_id: params.classId,
    p_student_name: params.studentName,
    p_slot_date: params.slotDate,
    p_slot_start_time: params.slotStartTime,
    p_answers: params.answers,
  })

  if (error) {
    const code = Object.keys(SUBMIT_ERROR_MESSAGES).find((key) => error.message.includes(key))
    throw new SubmitBookingError(code ?? 'unknown')
  }

  return data as string
}

export async function getBookingByAccessToken(token: string): Promise<BookingView | null> {
  const rows = await callRpc<BookingView[]>('get_booking_by_access_token', { p_token: token })
  return rows?.[0] ?? null
}

// ── 관리교사 계정 ───────────────────────────────────────────────────────

export async function isUsernameAvailable(username: string): Promise<boolean> {
  return await callRpc<boolean>('is_username_available', { p_username: username })
}

/** 아이디로 로그인하기 위해 실제 이메일을 찾는다. 없는 아이디면 null. */
export async function getEmailForUsername(username: string): Promise<string | null> {
  return await callRpc<string | null>('get_email_for_username', { p_username: username })
}
