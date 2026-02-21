## Why

The platform needs project management with real filesystem backing — each project is a git repository cloned into a Docker-mounted workspace volume. Currently the Project model is a bare DB record (name, description, path) with no git integration, no workspace volume, and no support for private repos. Without this, users can't connect code repositories to the platform or query them.

## What Changes

- Add a `workspace` Docker volume mounted to the API container, giving the backend read/write access to project directories
- Enhance the Project model with `gitUrl`, `branch`, `status` (cloning/ready/error), and an encrypted `gitToken` field for private repo access (PAT)
- Add API endpoints to clone a git repo into `workspace/<project-id>/`, check clone status, and delete project directories
- When cloning, inject the stored PAT into the git URL for authentication (supports GitHub, GitLab, Bitbucket HTTPS PATs)
- Rework the frontend Projects page: create-project form accepts a git URL and optional git token, shows clone progress/status
- Add `WORKSPACE_PATH` env var (defaults to `/workspace` in Docker, configurable for local dev)

## Capabilities

### New Capabilities
- `project-workspace`: Docker volume setup, filesystem operations (create/delete project dirs), `WORKSPACE_PATH` configuration
- `project-git-clone`: Clone a git repo into a project workspace directory, track clone status, handle errors, inject PAT for private repos
- `project-git-auth`: Store and manage per-project git credentials (PAT) for private repository access, encrypted at rest
- `project-management`: Enhanced Project model, API endpoints (CRUD + status), frontend Projects page with git URL / token input and status display

### Modified Capabilities
_None — the existing Project model/routes are minimal stubs that will be replaced by the new capabilities above._

## Impact

- **Database**: New fields on `Project` model (`gitUrl`, `branch`, `status`, `gitToken` encrypted); migration required
- **Docker**: `docker-compose.yml` updated with `workspace` named volume on `api` service
- **API**: New routes under `/api/projects/:id/clone`, enhanced `/api/projects` CRUD
- **Shared types**: New types (`ProjectStatus`, updated `Project`, `CreateProjectRequest`)
- **Frontend**: `ProjectsPage`, `NewProjectPage`, `ProjectCard` reworked; new project-detail page
- **Environment**: New `WORKSPACE_PATH` env var in `.env.example` and `packages/api/.env`
- **Security**: Git PAT stored encrypted in DB, never returned in API responses after creation
