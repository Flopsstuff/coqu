import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ApiResponse, HealthStatus } from "@coqu/shared";
import { useAuth } from "../AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then((data: ApiResponse<HealthStatus>) => {
        if (data.success && data.data) {
          setHealth(data.data);
        } else {
          setError(data.error ?? "Unknown error");
        }
      })
      .catch(() => setError("Failed to connect to API"));
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

      {error && <div className="error">{error}</div>}

      {health && (
        <div className="status-card">
          <div className="status-row">
            <span className="status-label">Status</span>
            <span className={`status-value ${health.status === "ok" ? "ok" : ""}`}>
              {health.status}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Version</span>
            <span className="status-value">{health.version}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Timestamp</span>
            <span className="status-value">{health.timestamp}</span>
          </div>
        </div>
      )}

      {!health && !error && <div className="loading">Loading...</div>}
    </div>
  );
}
