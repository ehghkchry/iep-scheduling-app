import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>개별화교육지원팀 협의회 시간 조율 앱</h1>
        <p className="muted">
          담임 선생님이 어려운 시간을 막아두면, 학부모님이 남은 시간 중에서 고르는 방식입니다.
        </p>
      </div>

      <div className="card stack">
        <h2>선생님이신가요?</h2>
        <p className="muted">
          협의회를 만들고 반과 질문을 관리하려면 구글 계정으로 로그인해 주세요. 담임 선생님과
          학부모님은 로그인 없이 받으신 링크로 바로 들어가시면 됩니다.
        </p>
        <Link className="btn btn--primary btn--block" to="/admin/login">
          선생님 로그인
        </Link>
      </div>
    </div>
  )
}
