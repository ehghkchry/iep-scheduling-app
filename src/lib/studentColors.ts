/**
 * 시간표에서 한 학생이 희망한 여러 칸을 눈으로 따라가기 쉽도록 학생마다 색을 준다.
 *
 * 이 다섯 색은 색각 이상(적록/청황) 시뮬레이션과 명도·채도 검사를 모든 조합에 대해
 * 통과한 조합이다. 여섯 번째 색을 넣으면 어떤 색을 골라도 어느 한 쌍이 서로
 * 구분되지 않는 수준으로 가까워져, 다섯에서 멈춘다.
 *
 * 여섯 명이 넘으면 색이 다시 처음부터 돌아간다. 칸에는 이름이 항상 함께 적히므로
 * 색이 겹쳐도 누구인지 헷갈릴 일은 없다 — 색은 어디까지나 훑어보기 위한 보조 표시다.
 */
export const STUDENT_COLORS = [
  '#2a78d6', // 파랑
  '#eb6834', // 주황
  '#1baf7a', // 청록
  '#4a3aa7', // 보라
  '#be185d', // 자주
]

/**
 * 이름 -> 색 매핑. 넘겨받은 순서대로 배정하므로 같은 목록이면 항상 같은 색이 나온다.
 * (해시로 정하면 두 명뿐이어도 같은 색이 걸릴 수 있어 순서대로 준다.)
 */
export function buildStudentColorMap(names: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const name of names) {
    if (!map.has(name)) {
      map.set(name, STUDENT_COLORS[map.size % STUDENT_COLORS.length])
    }
  }
  return map
}
