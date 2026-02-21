import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        gitUrl: gitUrl.trim() || undefined,
        branch: branch.trim() || undefined,
        gitToken: gitToken || undefined,
      }),
    });

    setSubmitting(false);

    if (res.success && res.data) {
      navigate("/projects");
    } else {
      setError(res.error ?? "Failed to create project");
    }
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">New Project</h2>
        </div>

        <form onSubmit={handleSubmit} className="new-project-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Project Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional project description"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gitUrl">Git URL</label>
            <input
              id="gitUrl"
              type="text"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="branch">Branch</label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main (optional, defaults to repo default)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gitToken">Git Token (PAT)</label>
            <input
              id="gitToken"
              type="password"
              value={gitToken}
              onChange={(e) => setGitToken(e.target.value)}
              placeholder="For private repos (optional)"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-create"
              disabled={!name.trim() || submitting}
            >
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
