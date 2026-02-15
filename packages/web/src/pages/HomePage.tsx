import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ApiResponse, HealthStatus } from "@coqu/shared";
import { useAuth } from "../AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then((data: ApiResponse<HealthStatus>) => {
        if (data.success && data.data) {
          setHealth(data.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="home">
      <header className="home-header">
        <h1>coqu</h1>
        <div className="user-info">
          <Link to="/tokens" className="btn btn-ghost">API Tokens</Link>
          <span className="user-name">{user?.name}</span>
          <button onClick={logout} className="btn btn-ghost">
            Logout
          </button>
        </div>
      </header>

      <div className="home-content">
      </div>

      {health && (
        <footer className="home-footer">
          <span className={`footer-status ${health.status === "ok" ? "ok" : ""}`}>
            {health.status}
          </span>
          <span className="footer-separator" />
          <span className="footer-item">v{health.version}</span>
          <span className="footer-separator" />
          <span className="footer-item">{health.timestamp}</span>
        </footer>
      )}
    </div>
  );
}
