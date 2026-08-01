/**
 * 관리교사가 학부모가 되어 직접 신청해 보기 위한 모드. 주소에 `?test=1`이 붙어 있는 동안에만
 * 켜지고, 학부모님께 보내는 링크에는 붙지 않는다.
 *
 * 켜져 있으면 제출 토큰을 브라우저에 저장하지 않는다(`bookingStorage`). 토큰이 남으면 같은
 * 반에 두 번째 학생을 넣을 수 없는데, 담임 화면의 이름 색 구분처럼 여러 명이 있어야 보이는
 * 것들을 확인할 수 없기 때문이다.
 *
 * 제출 자체는 진짜로 저장된다. 화면만 흉내 내면 담임·관리자 화면에 제대로 도착하는지를
 * 확인할 수 없어서다. 그래서 연습용 협의회를 따로 만들어 쓰고, 끝나면 협의회를 통째로 지운다.
 */

export const TEST_PARAM = 'test'

export function isTestMode(params: URLSearchParams): boolean {
  return params.get(TEST_PARAM) === '1'
}

/**
 * 테스트 모드일 때만 주소에 `?test=1`을 얹는다. 학부모 화면끼리 이동해도 모드가 풀리지
 * 않아야 하므로 링크를 만들 때마다 통과시킨다.
 *
 * `extra`는 함께 실어 보낼 값들. 제출 완료 화면은 주소에 예약 토큰밖에 없어서, 되돌아갈
 * 반을 알려주려면 이 방법이 필요하다.
 */
export function withTestMode(
  path: string,
  testMode: boolean,
  extra?: Record<string, string>,
): string {
  if (!testMode) return path
  const params = new URLSearchParams({ [TEST_PARAM]: '1', ...extra })
  return `${path}?${params.toString()}`
}
