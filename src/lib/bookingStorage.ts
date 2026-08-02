/**
 * 학부모 URL은 모든 학부모가 공유하므로, "누가 제출한 것인지"를 서버가 알 방법이 없다.
 * 제출 시 발급된 예약 토큰을 이 브라우저에만 저장해 두고, 재방문하면 그 토큰으로
 * 본인 제출 내용을 다시 보여준다.
 *
 * 한 반에 여러 건을 담는다. 특수교육대상 자녀가 둘 이상이면서 같은 반인 경우가 있는데,
 * 반마다 한 건만 기억하면 둘째부터는 넣을 방법이 아예 없어진다.
 *
 * 한계: 다른 기기나 시크릿 모드에서는 이 값이 없어 내용을 볼 수 없다.
 * 그 경우의 중복 제출은 DB의 (반, 학생이름) 유니크 제약이 막는다.
 */

const PREFIX = 'iep-booking:'

export interface StoredBooking {
  token: string
  /** 반 선택 화면에 "누구를 신청했는지" 보여주는 데 쓴다. 예전 형식에는 없어서 null일 수 있다. */
  name: string | null
}

function keyFor(classId: string): string {
  return `${PREFIX}${classId}`
}

/**
 * 이 브라우저가 이 반에 낸 제출들. 낸 순서대로.
 *
 * 예전에는 토큰 문자열 하나만 넣어 두었다. 이미 제출하신 분이 앱을 다시 열었을 때
 * 자기 내용을 못 보게 되면 안 되므로, 그 형식도 한 건짜리 목록으로 읽어준다.
 */
export function getStoredBookings(classId: string): StoredBooking[] {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(keyFor(classId))
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힌 경우
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 토큰만 들어 있던 예전 형식 (JSON이 아니다)
    return [{ token: raw, name: null }]
  }
  if (!Array.isArray(parsed)) return [{ token: raw, name: null }]

  return parsed
    .filter(
      (item): item is { token: string; name?: unknown } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { token?: unknown }).token === 'string',
    )
    .map((item) => ({
      token: item.token,
      name: typeof item.name === 'string' ? item.name : null,
    }))
}

/** 가장 마지막에 낸 제출. 링크를 다시 열었을 때 어느 화면을 보여줄지 고르는 데 쓴다. */
export function getLatestBookingToken(classId: string): string | null {
  const bookings = getStoredBookings(classId)
  return bookings.length > 0 ? bookings[bookings.length - 1].token : null
}

export function addStoredBooking(classId: string, token: string, name: string): void {
  const next = [...getStoredBookings(classId), { token, name }]
  try {
    window.localStorage.setItem(keyFor(classId), JSON.stringify(next))
  } catch {
    // 저장하지 못해도 제출 자체는 끝난 상태라 그대로 진행한다
  }
}
