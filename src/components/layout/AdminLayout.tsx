import { Suspense } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import './AdminLayout.css'

export default function AdminLayout() {
  const { signOut, displayName } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <Link to="/admin" className="admin-bar__brand">
            협의회 시간 조율
          </Link>
          <div className="row" style={{ gap: 8 }}>
            {displayName && <span className="admin-bar__user">{displayName}</span>}
            <button className="btn btn--ghost btn--sm" type="button" onClick={handleSignOut}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      {/*
        관리 화면들은 따로 내려받는다(App.tsx 참고). 기다리는 표시를 이 안쪽에만 두어야
        메뉴 막대는 그대로 있고 내용만 바뀐다. 이 경계를 막대 위에 두면 관리 화면끼리
        오갈 때마다 막대까지 사라졌다 나타난다.
      */}
      <Suspense
        fallback={
          <div className="page page--narrow">
            <p className="muted">불러오는 중…</p>
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </>
  )
}
