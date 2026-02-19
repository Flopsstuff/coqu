import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "@coqu/shared";
import { Header } from "../Header";
import { apiFetch } from "../api";
import { ProjectList } from "../components/ProjectList";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const res = await apiFetch<Project[]>("/api/projects");
    if (res.success && res.data) {
      setProjects(res.data);
    }
    setLoading(false);
  }

  return (
    <div className="home">
      <Header />

      <div className="home-content">
        <div className="page-header">
          <h2 className="page-title">Projects</h2>
          <Link to="/projects/new" className="btn btn-primary btn-add">
            Add New Project
          </Link>
        </div>

        {loading ? (
          <div className="projects-loading">Loading projects...</div>
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
    </div>
  );
}
