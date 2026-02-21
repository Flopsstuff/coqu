import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Project, ProjectStatus, BranchListResponse, CommitInfoResponse } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  cloning: { label: "Cloning…", className: "badge-cloning" },
  ready: { label: "Ready", className: "badge-ready" },
  error: { label: "Error", className: "badge-error" },
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gitToken, setGitToken] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [switching, setSwitching] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [commitHash, setCommitHash] = useState("");
  const [commitMessage, setCommitMessage] = useState("");

  const loadProject = useCallback(async () => {
    const res = await apiFetch<Project>(`/api/projects/${id}`);
    if (res.success && res.data) {
      setProject(res.data);
    } else {
      setError(res.error ?? "Project not found");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Poll while cloning
  useEffect(() => {
    if (project?.status !== "cloning") return;
    const interval = setInterval(async () => {
      const res = await apiFetch<Project>(`/api/projects/${id}`);
      if (res.success && res.data) {
        setProject(res.data);
        if (res.data.status !== "cloning") {
          setCloning(false);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [project?.status, id]);

  // Load branches when project is ready
  useEffect(() => {
    if (project?.status !== "ready") return;
    apiFetch<BranchListResponse>(`/api/projects/${id}/branches`).then((res) => {
      if (res.success && res.data) {
        setBranches(res.data.branches);
        setCurrentBranch(res.data.current);
        setSelectedBranch(res.data.current);
      }
    });
  }, [project?.status, id]);

  // Load commit info when project is ready
  const loadCommitInfo = useCallback(() => {
    if (project?.status !== "ready") return;
    apiFetch<CommitInfoResponse>(`/api/projects/${id}/commit`).then((res) => {
      if (res.success && res.data) {
        setCommitHash(res.data.hash);
        setCommitMessage(res.data.message);
      }
    });
  }, [project?.status, id]);

  useEffect(() => {
    loadCommitInfo();
  }, [loadCommitInfo]);

  async function handleBranchSwitch() {
    if (!selectedBranch || selectedBranch === currentBranch) return;
    setSwitching(true);
    setError(null);
    const res = await apiFetch<Project>(`/api/projects/${id}/checkout`, {
      method: "POST",
      body: JSON.stringify({ branch: selectedBranch }),
    });
    if (res.success && res.data) {
      setProject(res.data);
      setCurrentBranch(selectedBranch);
      loadCommitInfo();
    } else {
      setError(res.error ?? "Failed to switch branch");
    }
    setSwitching(false);
  }

  async function handlePull() {
    setPulling(true);
    setError(null);
    const res = await apiFetch<Project>(`/api/projects/${id}/pull`, { method: "POST" });
    if (res.success && res.data) {
      setProject(res.data);
      loadCommitInfo();
    } else {
      setError(res.error ?? "Failed to pull");
    }
    setPulling(false);
  }

  async function handleClone() {
    setCloning(true);
    setError(null);
    const res = await apiFetch<Project>(`/api/projects/${id}/clone`, { method: "POST" });
    if (res.success && res.data) {
      setProject(res.data);
    } else {
      setError(res.error ?? "Failed to start clone");
      setCloning(false);
    }
  }

  async function handleTokenUpdate(e: React.FormEvent) {
    e.preventDefault();
    setTokenSaving(true);
    const res = await apiFetch<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ gitToken: gitToken || null }),
    });
    if (res.success && res.data) {
      setProject(res.data);
      setGitToken("");
    }
    setTokenSaving(false);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const res = await apiFetch<never>(`/api/projects/${id}`, { method: "DELETE" });
    if (res.success) {
      navigate("/projects");
    } else {
      setError(res.error ?? "Failed to delete project");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="home">
        <Header />
        <div className="home-content">
          <div className="projects-loading">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="home">
        <Header />
        <div className="home-content">
          <div className="project-empty">
            <p>{error ?? "Project not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const badge = statusConfig[project.status];
  const canClone = project.status === "pending" || project.status === "error";

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">{project.name}</h2>
          <span className={`status-badge ${badge.className}`}>{badge.label}</span>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="project-detail">
          <div className="project-detail-section">
            <h3>Info</h3>
            {project.description && (
              <div className="detail-field">
                <div className="detail-label">Description</div>
                <div className="detail-value">{project.description}</div>
              </div>
            )}
            <div className="detail-field">
              <div className="detail-label">Git URL</div>
              <div className="detail-value mono">{project.gitUrl ?? "Not set"}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Branch</div>
              <div className="detail-value mono">{currentBranch || project.branch || "—"}</div>
            </div>
            {commitHash && (
              <div className="detail-field">
                <div className="detail-label">Commit</div>
                <div className="detail-value mono">{commitHash.slice(0, 7)}</div>
              </div>
            )}
            {commitMessage && (
              <div className="detail-field">
                <div className="detail-label">Commit Message</div>
                <div className="detail-value">{commitMessage}</div>
              </div>
            )}
            <div className="detail-field">
              <div className="detail-label">Git Token</div>
              <div className="detail-value">
                {project.hasGitToken ? "Configured" : "Not configured"}
              </div>
            </div>
            {project.path && (
              <div className="detail-field">
                <div className="detail-label">Path</div>
                <div className="detail-value mono">{project.path}</div>
              </div>
            )}
            {project.statusMessage && (
              <div className="detail-field">
                <div className="detail-label">Status Message</div>
                <div className="status-message">{project.statusMessage}</div>
              </div>
            )}
          </div>

          <div className="project-detail-section">
            <h3>Actions</h3>
            <div className="detail-actions">
              {canClone && project.gitUrl && (
                <button
                  className="btn btn-success"
                  onClick={handleClone}
                  disabled={cloning}
                >
                  {cloning ? "Starting clone..." : "Clone Repository"}
                </button>
              )}
              {project.status === "ready" && (
                <button
                  className="btn btn-ghost"
                  onClick={handlePull}
                  disabled={pulling}
                >
                  {pulling ? "Pulling..." : "Pull"}
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete Project"}
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

          {project.status === "ready" && branches.length > 0 && (
            <div className="project-detail-section">
              <h3>Branch</h3>
              <div className="branch-switcher">
                <select
                  className="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={switching}
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary branch-switch-btn"
                  onClick={handleBranchSwitch}
                  disabled={switching || selectedBranch === currentBranch}
                >
                  {switching ? "Switching..." : "Switch Branch"}
                </button>
              </div>
            </div>
          )}

          <div className="project-detail-section">
            <h3>Update Git Token</h3>
            <form onSubmit={handleTokenUpdate} className="token-update-form">
              <div className="form-group">
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="Enter new token (leave empty to remove)"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={tokenSaving}
              >
                {tokenSaving ? "Saving..." : "Save Token"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
