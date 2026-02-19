import type { Project } from "@coqu/shared";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        {project.path && (
          <span className="project-card-path">{project.path}</span>
        )}
      </div>
      {project.description && (
        <p className="project-card-description">{project.description}</p>
      )}
      <div className="project-card-meta">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
