import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/admin" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ username, password })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>선생님 로그인</h1>
        <p className="muted">개별화교육지원팀 협의회 시간 조율 앱</p>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        <div className="field">
          <label className="label" htmlFor="username">
            아이디
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>

        <hr className="divider" />

        <div className="row row--between">
          <Link to="/admin/signup" className="tiny">
            처음이신가요? 회원가입
          </Link>
          <Link to="/admin/forgot-password" className="tiny">
            비밀번호를 잊으셨나요?
          </Link>
        </div>
      </form>
    </div>
  )
}
