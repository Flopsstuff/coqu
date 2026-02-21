import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Agent, AgentStatus, AgentEnv } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  installing: { label: "Installing…", className: "badge-cloning" },
  installed: { label: "Installed", className: "badge-ready" },
  error: { label: "Error", className: "badge-error" },
};

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envContent, setEnvContent] = useState("");
  const [envLoading, setEnvLoading] = useState(true);
  const [envSaving, setEnvSaving] = useState(false);
  const [envSaved, setEnvSaved] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadAgent = useCallback(async () => {
    const res = await apiFetch<Agent>(`/api/agents/${id}`);
    if (res.success && res.data) {
      setAgent(res.data);
    } else {
      setError(res.error ?? "Agent not found");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  // Poll during installing status
  useEffect(() => {
    if (agent?.status !== "installing") return;
    const interval = setInterval(async () => {
      const res = await apiFetch<Agent>(`/api/agents/${id}`);
      if (res.success && res.data) {
        setAgent(res.data);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [agent?.status, id]);

  // Load env file
  useEffect(() => {
    if (!id) return;
    apiFetch<AgentEnv>(`/api/agents/${id}/env`).then((res) => {
      if (res.success && res.data) {
        setEnvContent(res.data.content);
      }
      setEnvLoading(false);
    });
  }, [id]);

  async function handleEnvSave() {
    setEnvSaving(true);
    setEnvSaved(false);
    const res = await apiFetch<never>(`/api/agents/${id}/env`, {
      method: "PUT",
      body: JSON.stringify({ content: envContent }),
    });
    setEnvSaving(false);
    if (res.success) {
      setEnvSaved(true);
      setTimeout(() => setEnvSaved(false), 2000);
    }
  }

  async function handleReinstall() {
    setReinstalling(true);
    setError(null);
    const res = await apiFetch<Agent>(`/api/agents/${id}/install`, { method: "POST" });
    if (res.success && res.data) {
      setAgent(res.data);
    } else {
      setError(res.error ?? "Failed to reinstall");
    }
    setReinstalling(false);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const res = await apiFetch<never>(`/api/agents/${id}`, { method: "DELETE" });
    if (res.success) {
      navigate("/agents");
    } else {
      setError(res.error ?? "Failed to delete agent");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="home">
        <Header />
        <div className="home-content">
          <div className="projects-loading">Loading agent...</div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="home">
        <Header />
        <div className="home-content">
          <div className="project-empty">
            <p>{error ?? "Agent not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const badge = statusConfig[agent.status];

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">{agent.name}</h2>
          <span className={`status-badge ${badge.className}`}>{badge.label}</span>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="project-detail">
          <div className="project-detail-section">
            <h3>Info</h3>
            <div className="detail-field">
              <div className="detail-label">Type</div>
              <div className="detail-value mono">{agent.type}</div>
            </div>
            {agent.version && (
              <div className="detail-field">
                <div className="detail-label">Version</div>
                <div className="detail-value mono">{agent.version}</div>
              </div>
            )}
            {agent.statusMessage && (
              <div className="detail-field">
                <div className="detail-label">Status Message</div>
                <div className="status-message">{agent.statusMessage}</div>
              </div>
            )}
          </div>

          <div className="project-detail-section">
            <h3>Actions</h3>
            <div className="detail-actions">
              {(agent.status === "installed" || agent.status === "error") && (
                <button
                  className="btn btn-primary"
                  onClick={handleReinstall}
                  disabled={reinstalling}
                >
                  {reinstalling ? "Reinstalling..." : "Reinstall"}
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete Agent"}
              </button>
              {confirmDelete && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="project-detail-section">
            <h3>Environment Variables</h3>
            {envLoading ? (
              <div className="projects-loading">Loading env...</div>
            ) : (
              <>
                <textarea
                  className="env-editor"
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  placeholder="ANTHROPIC_API_KEY=sk-ant-..."
                  rows={10}
                  style={{ width: "100%", fontFamily: "monospace", resize: "vertical" }}
                />
                <div className="detail-actions" style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleEnvSave}
                    disabled={envSaving}
                  >
                    {envSaving ? "Saving..." : envSaved ? "Saved!" : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
