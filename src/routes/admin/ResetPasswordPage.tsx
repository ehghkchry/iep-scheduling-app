import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/**
 * 메일의 재설정 링크를 누르면 여기로 온다.
 * 이때 Supabase가 URL 조각으로 임시 세션을 붙여주므로 updateUser로 비밀번호를 바꿀 수 있다.
 */
export default function ResetPasswordPage() {
  const { updatePassword, session, loading } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      setError('두 번 입력한 비밀번호가 서로 다릅니다.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호를 바꾸지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page page--narrow">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  // 링크 없이 주소만 직접 친 경우
  if (!session) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>링크가 만료되었습니다</h1>
          <p className="muted">
            재설정 링크가 만료되었거나 올바르지 않습니다. 비밀번호 찾기를 다시 진행해 주세요.
          </p>
          <Link className="btn btn--primary btn--block" to="/admin/forgot-password">
            비밀번호 찾기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>새 비밀번호 설정</h1>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        <div className="field">
          <label className="label" htmlFor="password">
            새 비밀번호
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <span className="tiny">6자 이상이면 됩니다.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="confirm">
            새 비밀번호 확인
          </label>
          <input
            id="confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? '바꾸는 중…' : '비밀번호 바꾸기'}
        </button>
      </form>
    </div>
  )
}
