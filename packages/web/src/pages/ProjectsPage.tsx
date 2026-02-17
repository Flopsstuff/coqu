import { useEffect, useState } from "react";
import type { Project } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const res = await apiFetch<Project[]>("/api/projects");
    if (res.success && res.data) {
      setProjects(res.data);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await apiFetch<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        path: path.trim() || undefined,
      }),
    });

    if (res.success && res.data) {
      setProjects((prev) => [res.data!, ...prev]);
      setName("");
      setDescription("");
      setPath("");
    } else {
      setError(res.error ?? "Failed to create project");
    }
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <h2 className="page-title">Projects</h2>

        <form onSubmit={handleCreate} className="project-form">
          <div className="project-form-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="project-input"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="project-input"
            />
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Path (optional)"
              className="project-input"
            />
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>

        {error && <div className="project-error">{error}</div>}

        <div className="project-list">
          {projects.map((p) => (
            <div key={p.id} className="project-item">
              <div className="project-item-info">
                <span className="project-item-name">{p.name}</span>
                {p.description && (
                  <span className="project-item-description">{p.description}</span>
                )}
                {p.path && (
                  <span className="project-item-path">{p.path}</span>
                )}
                <span className="project-item-meta">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="project-empty">No projects yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
