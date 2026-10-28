import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span>Guapea</span>
        </NavLink>
        <nav style={{ display: 'flex', gap: '0.25rem' }}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Lista
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Admin
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
