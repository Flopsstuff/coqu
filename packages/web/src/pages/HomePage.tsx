import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ApiResponse, HealthStatus, QueryResponse } from "@coqu/shared";
import { useAuth } from "../AuthContext";
import { apiFetch } from "../api";

export function HomePage() {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiFetch<QueryResponse>("/api/query", {
        method: "POST",
        body: JSON.stringify({ query: query.trim() }),
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Query failed");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

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
        <form className="query-form" onSubmit={handleSubmit}>
          <div className="query-form-row">
            <input
              type="text"
              className="query-input"
              placeholder="Enter a query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary query-submit-btn"
              disabled={loading || !query.trim()}
            >
              {loading ? "Running..." : "Submit"}
            </button>
          </div>
        </form>

        {loading && (
          <p className="query-loading">Running query...</p>
        )}

        {error && (
          <div className="query-error">{error}</div>
        )}

        {result && (
          <div className="query-result">
            <div className="query-result-header">Result</div>
            <pre className="query-result-body">{result.result}</pre>
            <div className="query-result-meta">
              Query: {result.query} &middot; {result.timestamp}
            </div>
          </div>
        )}
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
