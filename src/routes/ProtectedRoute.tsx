import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** 로그인하지 않은 사람이 관리 화면에 들어오면 로그인 화면으로 보낸다. */
export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // 세션 복원 전에 그리면 로그인한 사람에게도 로그인 화면이 잠깐 스친다
  if (loading) {
    return (
      <div className="page page--narrow">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
