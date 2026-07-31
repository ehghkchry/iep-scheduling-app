import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page page--narrow">
      <div className="card stack">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="muted">
          주소가 잘못되었거나 링크가 만료되었습니다. 받으신 링크를 다시 확인해 주세요.
        </p>
        <Link className="btn btn--block" to="/">
          처음 화면으로
        </Link>
      </div>
    </div>
  )
}
