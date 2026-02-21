import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="home-header">
      <h1>
        <Link to="/" className="header-link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="36" height="36" style={{ verticalAlign: "middle", marginRight: 8 }}>
            <circle cx="32" cy="32" r="30" fill="#10b981"/>
            <text x="32" y="46" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="44" fill="white">?</text>
          </svg>
          coqu
        </Link>
      </h1>
      <div className="user-info">
        <Link to="/projects" className={`btn btn-ghost${pathname === "/projects" ? " btn-ghost-active" : ""}`}>Projects</Link>
        <Link to="/agents" className={`btn btn-ghost${pathname === "/agents" || pathname.startsWith("/agents/") ? " btn-ghost-active" : ""}`}>Agents</Link>
        <Link to="/tokens" className={`btn btn-ghost${pathname === "/tokens" ? " btn-ghost-active" : ""}`}>API Tokens</Link>
        <span className="user-name">{user?.name}</span>
        <button onClick={logout} className="btn btn-ghost">
          Logout
        </button>
      </div>
    </header>
  );
}
