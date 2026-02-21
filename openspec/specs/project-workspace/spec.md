## ADDED Requirements

### Requirement: Workspace volume configuration
The system SHALL read the `WORKSPACE_PATH` environment variable to determine the root directory for project workspaces. If `WORKSPACE_PATH` is not set, it SHALL default to `/workspace`.

#### Scenario: WORKSPACE_PATH is set
- **WHEN** the API starts with `WORKSPACE_PATH=/data/projects`
- **THEN** the system uses `/data/projects` as the workspace root

#### Scenario: WORKSPACE_PATH is not set
- **WHEN** the API starts without `WORKSPACE_PATH` defined
- **THEN** the system uses `/workspace` as the workspace root

### Requirement: Workspace directory initialization
The system SHALL ensure the workspace root directory exists when the API starts. If the directory does not exist, the system SHALL create it.

#### Scenario: Workspace directory does not exist at startup
- **WHEN** the API starts and `WORKSPACE_PATH` directory does not exist
- **THEN** the system creates the directory (including parents) and logs the path

#### Scenario: Workspace directory already exists at startup
- **WHEN** the API starts and `WORKSPACE_PATH` directory already exists
- **THEN** the system proceeds without error

### Requirement: Docker volume mount
The production `docker-compose.yml` SHALL define a named volume `workspace_data` and mount it at `/workspace` on the API service container.

#### Scenario: API container starts in Docker
- **WHEN** the API container starts via `docker-compose up`
- **THEN** the `/workspace` directory is available and writable inside the container

#### Scenario: Volume persists across restarts
- **WHEN** the API container is stopped and restarted
- **THEN** all files in `/workspace` are preserved

### Requirement: Project directory naming
Each project's workspace directory SHALL be located at `<WORKSPACE_PATH>/<project-id>/` where `project-id` is the project's UUID.

#### Scenario: Project directory path
- **WHEN** a project with ID `abc-123` exists and `WORKSPACE_PATH` is `/workspace`
- **THEN** the project directory is `/workspace/abc-123/`

### Requirement: Project directory cleanup on deletion
The system SHALL remove the project's workspace directory when a project is deleted.

#### Scenario: Delete project with existing directory
- **WHEN** a project is deleted and its workspace directory exists
- **THEN** the system recursively removes `<WORKSPACE_PATH>/<project-id>/`

#### Scenario: Delete project with no directory
- **WHEN** a project is deleted and its workspace directory does not exist
- **THEN** the deletion succeeds without filesystem errors
