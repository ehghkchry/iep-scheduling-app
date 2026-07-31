import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/** 'hongkildong@gmail.com' -> 'hon*******@gmail.com' */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, Math.min(3, local.length))
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`
}

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()

  const [username, setUsername] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const email = await requestPasswordReset(username)
      setSentTo(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : '메일을 보내지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>재설정 메일을 보냈습니다</h1>
          <div className="alert alert--success">
            <strong>{maskEmail(sentTo)}</strong> 으로 비밀번호 재설정 링크를 보냈습니다. 메일함을
            확인해 주세요.
          </div>
          <p className="tiny">
            메일이 보이지 않으면 스팸함도 확인해 보세요. 가입할 때 적은 이메일로만 발송됩니다.
          </p>
          <Link className="btn btn--primary btn--block" to="/admin/login">
            로그인 화면으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--narrow">
      <div className="page-header">
        <h1>비밀번호 찾기</h1>
        <p className="muted">가입할 때 등록한 이메일로 재설정 링크를 보내드립니다.</p>
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

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? '보내는 중…' : '재설정 메일 받기'}
        </button>

        <hr className="divider" />

        <Link to="/admin/login" className="tiny">
          로그인 화면으로 돌아가기
        </Link>
      </form>
    </div>
  )
}
