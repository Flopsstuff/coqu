import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Agent } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

export function NewAgentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState("claude-code");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<Agent>("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        type,
      }),
    });

    setSubmitting(false);

    if (res.success && res.data) {
      navigate("/agents");
    } else {
      setError(res.error ?? "Failed to create agent");
    }
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">New Agent</h2>
        </div>

        <form onSubmit={handleSubmit} className="new-project-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Agent Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Claude Agent"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="branch-select"
            >
              <option value="claude-code">Claude Code</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate("/agents")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-create"
              disabled={!name.trim() || submitting}
            >
              {submitting ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
