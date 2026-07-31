import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import './AdminLayout.css'

export default function AdminLayout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <>
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <Link to="/admin" className="admin-bar__brand">
            협의회 시간 조율
          </Link>
          <button className="btn btn--ghost btn--sm" type="button" onClick={handleSignOut}>
            로그아웃
          </button>
        </div>
      </header>
      <Outlet />
    </>
  )
}
