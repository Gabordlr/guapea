import { NavLink, Outlet } from "react-router-dom";
import { authClient } from "../auth/client";
import { BrandLogo } from "./logo";

export function Layout() {
  const session = authClient.useSession();
  const isAdmin = Boolean(session.data?.user);

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Guapea">
          <BrandLogo />
        </NavLink>
        <nav style={{ display: "flex", gap: "0.25rem" }}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Lista
          </NavLink>
          {isAdmin ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              Admin
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `nav-link${isActive ? " active" : ""}`
              }
            >
              Entrar
            </NavLink>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
