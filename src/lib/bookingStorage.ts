/**
 * 학부모 URL은 모든 학부모가 공유하므로, "누가 제출한 것인지"를 서버가 알 방법이 없다.
 * 제출 시 발급된 예약 토큰을 이 브라우저에만 저장해 두고, 재방문하면 그 토큰으로
 * 본인 제출 내용을 다시 보여준다.
 *
 * 한계: 다른 기기나 시크릿 모드에서는 이 값이 없어 내용을 볼 수 없다.
 * 그 경우의 중복 제출은 DB의 (반, 학생이름) 유니크 제약이 막는다.
 */

const PREFIX = 'iep-booking:'

function keyFor(classId: string): string {
  return `${PREFIX}${classId}`
}

export function getStoredBookingToken(classId: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(classId))
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힌 경우
    return null
  }
}

export function storeBookingToken(classId: string, token: string): void {
  try {
    window.localStorage.setItem(keyFor(classId), token)
  } catch {
    // 저장하지 못해도 제출 자체는 끝난 상태라 그대로 진행한다
  }
}

export function clearStoredBookingToken(classId: string): void {
  try {
    window.localStorage.removeItem(keyFor(classId))
  } catch {
    // 무시
  }
}
