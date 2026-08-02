/**
 * 학부모 화면끼리 오가는 주소를 한 군데서 만든다.
 *
 * 여러 화면이 같은 약속을 지켜야 하는 값들이 있어서, 각자 문자열을 적어두면
 * 한쪽만 고쳤을 때 조용히 어긋난다.
 */

import { withTestMode } from './testMode'

/**
 * 반 선택 화면을 일부러 열었다는 표시.
 *
 * 학부모 URL은 이미 신청한 게 있으면 신청 목록을 보여준다. 목록에서 '추가 신청하기'를
 * 누른 경우에만 이 표시가 붙어 반 선택으로 넘어간다.
 */
export const ADD_PARAM = 'add'

/** 방금 제출을 마치고 왔다는 표시. 목록 맨 위에 접수 안내를 띄우는 데만 쓴다. */
export const SUBMITTED_PARAM = 'submitted'

/**
 * 학부모가 링크로 처음 만나는 주소.
 *
 * 이 기기로 낸 신청이 있으면 신청 목록, 없으면 반 선택 화면이 나온다.
 */
export function eventEntryPath(
  eventToken: string,
  testMode: boolean,
  options?: { pickClass?: boolean; justSubmitted?: boolean },
): string {
  const extra: Record<string, string> = {}
  if (options?.pickClass) extra[ADD_PARAM] = '1'
  if (options?.justSubmitted) extra[SUBMITTED_PARAM] = '1'
  return withTestMode(`/event/${eventToken}`, testMode, extra)
}

/** 어느 반의 입력 화면 */
export function classFormPath(eventToken: string, classId: string, testMode: boolean): string {
  return withTestMode(`/event/${eventToken}/class/${classId}`, testMode)
}

/**
 * 제출한 내용을 보는 화면.
 *
 * 주소에 예약 토큰밖에 없으면 그 화면에서 목록으로 돌아갈 수 없다.
 * 어느 협의회에서 왔는지를 함께 실어 보내는 이유다.
 */
export function bookingViewPath(
  bookingToken: string,
  eventToken: string,
  testMode: boolean,
): string {
  return withTestMode(`/booking/${bookingToken}`, testMode, { event: eventToken })
}
