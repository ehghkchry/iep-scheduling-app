import { Link } from 'react-router-dom'

/**
 * 테스트 모드에서 학부모 화면 맨 위에 붙는 띠.
 * 어느 단계에 있든 "지금은 연습"이라는 게 보여야 실제 제출과 헷갈리지 않는다.
 *
 * 나가는 링크도 여기 둔다. 학부모 화면에는 관리자로 가는 길이 없어서(있으면 안 되므로)
 * 이 띠가 없으면 테스트하다 돌아갈 방법이 주소창밖에 없다.
 */
export default function TestModeBanner() {
  return (
    <div className="test-banner" role="status">
      <strong>테스트 중입니다</strong>
      <span>학부모님이 보시는 화면 그대로입니다. 제출하면 실제로 저장됩니다.</span>
      <Link className="test-banner__exit" to="/admin">
        관리자 화면으로 나가기
      </Link>
    </div>
  )
}
