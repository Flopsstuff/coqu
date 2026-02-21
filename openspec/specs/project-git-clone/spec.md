## ADDED Requirements

### Requirement: Clone endpoint
The system SHALL provide a `POST /api/projects/:id/clone` endpoint that initiates a git clone of the project's `gitUrl` into the project's workspace directory.

#### Scenario: Successful clone initiation
- **WHEN** an authenticated user calls `POST /api/projects/:id/clone` for a project with status `pending` or `error`
- **THEN** the system sets status to `cloning`, starts a background `git clone` process, and responds with `202 Accepted` and the updated project

#### Scenario: Clone already in progress
- **WHEN** an authenticated user calls `POST /api/projects/:id/clone` for a project with status `cloning`
- **THEN** the system responds with `409 Conflict` and error message "Clone already in progress"

#### Scenario: Project already cloned
- **WHEN** an authenticated user calls `POST /api/projects/:id/clone` for a project with status `ready`
- **THEN** the system responds with `409 Conflict` and error message "Project already cloned"

#### Scenario: Project has no git URL
- **WHEN** an authenticated user calls `POST /api/projects/:id/clone` for a project with no `gitUrl`
- **THEN** the system responds with `400 Bad Request` and error message "Project has no git URL"

### Requirement: Async clone execution
The system SHALL execute `git clone` as a child process using `execFile`. The clone SHALL run asynchronously without blocking the API event loop.

#### Scenario: Clone completes successfully
- **WHEN** the `git clone` child process exits with code 0
- **THEN** the system updates the project status to `ready`, sets `path` to the workspace directory path, and clears `statusMessage`

#### Scenario: Clone fails
- **WHEN** the `git clone` child process exits with a non-zero code
- **THEN** the system updates the project status to `error` and sets `statusMessage` to the stderr output (with git token scrubbed from the message)

### Requirement: Clone with PAT authentication
When a project has a stored `gitToken`, the system SHALL decrypt the token and inject it into the HTTPS URL for the `git clone` command.

#### Scenario: Clone private repo with PAT
- **WHEN** a clone is initiated for a project with `gitUrl` and a stored `gitToken`
- **THEN** the system constructs the authenticated URL `https://<pat>@<host>/<path>` and passes it to `git clone`

#### Scenario: Clone public repo without PAT
- **WHEN** a clone is initiated for a project without a `gitToken`
- **THEN** the system uses the original `gitUrl` unmodified

#### Scenario: Clone error message scrubs PAT
- **WHEN** a clone fails and the stderr output contains the PAT value
- **THEN** the `statusMessage` replaces the PAT with `***` before storing

### Requirement: Clone timeout
The system SHALL enforce a 5-minute timeout on clone operations. If the clone exceeds this timeout, the child process SHALL be killed.

#### Scenario: Clone exceeds timeout
- **WHEN** a `git clone` process runs for more than 5 minutes
- **THEN** the system kills the process, sets project status to `error`, and sets `statusMessage` to "Clone timed out"

### Requirement: Branch selection
The system SHALL support an optional `branch` field on the Project model. If `branch` is specified, the clone SHALL use `git clone --branch <branch> --single-branch`.

#### Scenario: Clone with specific branch
- **WHEN** a project has `branch` set to `develop`
- **THEN** the system runs `git clone --branch develop --single-branch <url> <dir>`

#### Scenario: Clone with default branch
- **WHEN** a project has no `branch` specified
- **THEN** the system runs `git clone <url> <dir>` (clones default branch)

### Requirement: Git binary availability
The API Docker image SHALL have the `git` binary installed.

#### Scenario: Git is available in container
- **WHEN** the API container starts
- **THEN** `git --version` executes successfully
