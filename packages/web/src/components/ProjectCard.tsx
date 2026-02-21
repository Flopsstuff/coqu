import { Link } from "react-router-dom";
import type { Project, ProjectStatus } from "@coqu/shared";

interface ProjectCardProps {
  project: Project;
}

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  cloning: { label: "Cloning…", className: "badge-cloning" },
  ready: { label: "Ready", className: "badge-ready" },
  error: { label: "Error", className: "badge-error" },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const badge = statusConfig[project.status];

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        <span className={`status-badge ${badge.className}`}>{badge.label}</span>
      </div>
      {project.description && (
        <p className="project-card-description">{project.description}</p>
      )}
      {project.gitUrl && (
        <span className="project-card-path">{project.gitUrl}</span>
      )}
      {(project.branch || project.path) && (
        <div className="project-card-details">
          {project.branch && <span className="project-card-path">{project.branch}</span>}
          {project.path && <span className="project-card-path">{project.path}</span>}
        </div>
      )}
      <div className="project-card-meta">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
