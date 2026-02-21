import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Agent, AgentStatus } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  installing: { label: "Installing…", className: "badge-cloning" },
  installed: { label: "Installed", className: "badge-ready" },
  error: { label: "Error", className: "badge-error" },
};

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    const res = await apiFetch<Agent[]>("/api/agents");
    if (res.success && res.data) {
      setAgents(res.data);
    }
    setLoading(false);
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">Agents</h2>
          <Link to="/agents/new" className="btn btn-primary btn-add">
            New Agent
          </Link>
        </div>

        {loading ? (
          <div className="projects-loading">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="project-empty">
            <p>No agents yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="project-list">
            {agents.map((agent) => {
              const badge = statusConfig[agent.status];
              return (
                <Link key={agent.id} to={`/agents/${agent.id}`} className="project-card">
                  <div className="project-card-header">
                    <h3 className="project-card-name">{agent.name}</h3>
                    <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                  </div>
                  <div className="project-card-meta">
                    <span className="mono">{agent.type}</span>
                    {agent.version && <span className="mono">v{agent.version}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
