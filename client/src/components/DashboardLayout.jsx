import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { useState } from 'react'

const getUser = () => {
  try {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      // normalise — backend stores _id, JWT payload stores id
      if (!parsed.id && parsed._id) parsed.id = parsed._id.toString()
      return parsed
    }
    const token = localStorage.getItem('token')
    if (!token) return null
    const decoded = JSON.parse(atob(token.split('.')[1]))
    if (!decoded.id && decoded._id) decoded.id = decoded._id.toString()
    return decoded
  } catch {
    return null
  }
}

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = getUser()

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'SG'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const navClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="logo-link">
            <Logo />
          </NavLink>
        </div>
        <nav className="nav-list">
          <NavLink to="/" end className={navClass}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/messages" className={navClass}>
            <span className="nav-icon">💬</span>
            <span className="nav-label">Messages</span>
          </NavLink>
          <NavLink to="/jobs" className={navClass}>
            <span className="nav-icon">🧾</span>
            <span className="nav-label">Jobs</span>
          </NavLink>
          <NavLink to="/payments" className={navClass}>
            <span className="nav-icon">💳</span>
            <span className="nav-label">Payments</span>
          </NavLink>
          <NavLink to="/my-profile" className={navClass}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>
              <span className="nav-icon">🛡</span>
              <span className="nav-label">Admin</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="logout" onClick={handleLogout}>🚪 Log out</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={() => setOpen((s) => !s)}>☰</button>
          </div>
          <div className="topbar-right">
            <div className="user-dropdown">
              <div className="avatar">{initials}</div>
              <div className="username">{user?.username || 'Guest'}</div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}
