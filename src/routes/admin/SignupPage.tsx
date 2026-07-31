import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function SignupPage() {
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 이메일 확인이 켜진 프로젝트에서는 가입 직후 세션이 없다. 그때만 보여준다.
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setSubmitting(true)
    try {
      await signUp({ username, email, password })
      try {
        await signIn({ username, password })
        navigate('/admin', { replace: true })
      } catch {
        setNeedsEmailConfirm(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (needsEmailConfirm) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>가입 신청이 접수되었습니다</h1>
          <div className="alert alert--info">
            <strong>{email}</strong> 으로 보낸 확인 메일의 링크를 눌러주세요. 확인을 마치면 아이디와
            비밀번호로 로그인할 수 있습니다.
          </div>
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
        <h1>회원가입</h1>
        <p className="muted">협의회를 만들고 관리하는 선생님만 가입하면 됩니다.</p>
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
          <span className="tiny">로그인할 때 쓸 아이디입니다. 대소문자는 구분하지 않습니다.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <span className="tiny">
            비밀번호를 잊었을 때 재설정 링크를 받는 용도입니다. 평소 로그인에는 쓰지 않습니다.
          </span>
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
            autoComplete="new-password"
            minLength={6}
            required
          />
          <span className="tiny">6자 이상이면 됩니다. 특수문자를 넣지 않아도 괜찮습니다.</span>
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
          {submitting ? '가입 중…' : '가입하기'}
        </button>

        <hr className="divider" />

        <Link to="/admin/login" className="tiny">
          이미 계정이 있으신가요? 로그인
        </Link>
      </form>
    </div>
  )
}
