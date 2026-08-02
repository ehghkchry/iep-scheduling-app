import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** 구글 로고. 외부 이미지를 불러오지 않도록 SVG로 직접 그린다. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58Z"
      />
    </svg>
  )
}

export default function HomePage() {
  const { signInWithGoogle, session, loading } = useAuth()
  const location = useLocation()

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 로그인이 필요해서 여기로 밀려온 경우, 원래 가려던 곳으로 돌려보낸다
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  async function handleSignIn() {
    setError(null)
    setSubmitting(true)
    try {
      await signInWithGoogle(from)
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>개별화교육지원팀 협의회 시간 조율 앱</h1>
        <p className="muted">
          각 학급 특수교사가 어려운 시간을 막아두면, 학부모님이 남은 시간 중에서 고르는
          방식입니다.
        </p>
      </div>

      <div className="card stack">
        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <p className="muted">불러오는 중…</p>
        ) : session ? (
          <>
            <p className="muted">이미 로그인되어 있습니다.</p>
            <Link className="btn btn--primary btn--block" to="/admin">
              내 협의회 보기
            </Link>
          </>
        ) : (
          <>
            <button
              className="btn btn--primary btn--block"
              type="button"
              onClick={handleSignIn}
              disabled={submitting}
            >
              <GoogleMark />
              {submitting ? '구글로 이동 중…' : '구글로 로그인'}
            </button>
            <p className="tiny">
              협의회를 만들고 관리하시는 특수 총괄교사만 로그인하시면 됩니다. 따로 가입하거나
              비밀번호를 만들지 않으셔도 됩니다.
            </p>
          </>
        )}

        <hr className="divider" />

        <p className="tiny">
          각 학급 특수교사와 학부모님은 로그인하지 않으셔도 됩니다. 받으신 링크로 바로 들어가시면
          됩니다.
        </p>

      </div>

      <p className="credit">ⓒ 2026 박길석 (특수교사)</p>
    </div>
  )
}
