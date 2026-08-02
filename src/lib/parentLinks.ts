/**
 * 학부모 화면끼리 오가는 주소를 한 군데서 만든다.
 *
 * 완료 화면과 입력 화면이 같은 약속을 지켜야 하는 값(아래 ANOTHER_CHILD_PARAM)이 있어서,
 * 각자 문자열을 적어두면 한쪽만 고쳤을 때 조용히 어긋난다.
 */

import { withTestMode } from './testMode'

/**
 * "이 반에 다른 자녀 신청하기"로 들어왔다는 표시.
 *
 * 입력 화면은 이미 제출한 반이면 확인 화면으로 되돌려보내는데, 이 표시가 있으면
 * 그걸 건너뛰고 빈 폼을 연다. 자녀가 둘 이상이면서 같은 반인 경우에 쓴다.
 */
export const ANOTHER_CHILD_PARAM = 'another'

/** 반 선택 화면 */
export function classPickerPath(eventToken: string, testMode: boolean): string {
  return withTestMode(`/event/${eventToken}`, testMode)
}

/** 어느 반의 입력 화면 */
export function classFormPath(
  eventToken: string,
  classId: string,
  options: { testMode: boolean; anotherChild?: boolean },
): string {
  return withTestMode(
    `/event/${eventToken}/class/${classId}`,
    options.testMode,
    options.anotherChild ? { [ANOTHER_CHILD_PARAM]: '1' } : undefined,
  )
}

/**
 * 제출 완료·확인 화면.
 *
 * 주소에 예약 토큰밖에 없으면 그 화면에서 다음 자녀를 신청하러 갈 수 없다.
 * 어느 반에서 왔는지를 함께 실어 보내는 이유다.
 */
export function bookingViewPath(
  bookingToken: string,
  eventToken: string,
  classId: string,
  testMode: boolean,
): string {
  return withTestMode(`/booking/${bookingToken}`, testMode, {
    event: eventToken,
    class: classId,
  })
}
