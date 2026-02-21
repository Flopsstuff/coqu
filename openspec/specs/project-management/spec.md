## ADDED Requirements

### Requirement: Enhanced Project data model
The `Project` model SHALL include the following fields: `id` (UUID), `name`, `description` (nullable), `gitUrl` (nullable), `branch` (nullable), `gitToken` (nullable, encrypted), `status` (enum: `pending`, `cloning`, `ready`, `error`; default `pending`), `statusMessage` (nullable), `path` (nullable), `createdAt`, `updatedAt`.

#### Scenario: Project schema after migration
- **WHEN** the database migration runs
- **THEN** the `Project` table has all specified columns with correct types and defaults

### Requirement: Create project with git URL and token
`POST /api/projects` SHALL accept `name`, `description`, `gitUrl`, `branch`, and `gitToken` in the request body. The project is created with status `pending`. If `gitToken` is provided, it SHALL be encrypted before storage.

#### Scenario: Create project with git URL and token
- **WHEN** an authenticated user calls `POST /api/projects` with `{ "name": "My App", "gitUrl": "https://github.com/user/repo.git", "gitToken": "ghp_abc123" }`
- **THEN** the system creates a project with status `pending`, encrypted `gitToken`, and returns `201 Created` with project data (including `hasGitToken: true`, excluding raw token)

#### Scenario: Create project without git URL
- **WHEN** an authenticated user calls `POST /api/projects` with `{ "name": "My App" }` (no gitUrl)
- **THEN** the system creates a project with status `pending`, `gitUrl` null, `gitToken` null, and returns `201 Created`

#### Scenario: Create project with missing name
- **WHEN** an authenticated user calls `POST /api/projects` with no name
- **THEN** the system returns `400 Bad Request` with error "Project name is required"

### Requirement: Get single project
The system SHALL provide `GET /api/projects/:id` that returns a single project by ID. The response SHALL include `hasGitToken` boolean but SHALL NOT include the raw or encrypted `gitToken`.

#### Scenario: Get existing project
- **WHEN** an authenticated user calls `GET /api/projects/:id` with a valid project ID
- **THEN** the system returns the project data including status fields and `hasGitToken`

#### Scenario: Get non-existent project
- **WHEN** an authenticated user calls `GET /api/projects/:id` with an unknown ID
- **THEN** the system returns `404 Not Found`

### Requirement: Update project
The system SHALL provide `PATCH /api/projects/:id` to update project fields including `gitToken`.

#### Scenario: Update git token
- **WHEN** an authenticated user calls `PATCH /api/projects/:id` with `{ "gitToken": "ghp_new" }`
- **THEN** the system encrypts and stores the new token

#### Scenario: Update project name
- **WHEN** an authenticated user calls `PATCH /api/projects/:id` with `{ "name": "New Name" }`
- **THEN** the system updates the name without affecting other fields

### Requirement: List projects
`GET /api/projects` SHALL return all projects ordered by `createdAt` descending, including status fields and `hasGitToken`.

#### Scenario: List projects
- **WHEN** an authenticated user calls `GET /api/projects`
- **THEN** the system returns all projects with their current status and `hasGitToken`

### Requirement: Delete project
The system SHALL provide `DELETE /api/projects/:id` that removes a project and its workspace directory.

#### Scenario: Delete existing project
- **WHEN** an authenticated user calls `DELETE /api/projects/:id` for an existing project
- **THEN** the system deletes the DB record, removes the workspace directory, and returns `{ success: true }`

#### Scenario: Delete project during clone
- **WHEN** an authenticated user calls `DELETE /api/projects/:id` for a project with status `cloning`
- **THEN** the system kills the clone process (if running), deletes the record and directory, and returns `{ success: true }`

#### Scenario: Delete non-existent project
- **WHEN** an authenticated user calls `DELETE /api/projects/:id` with an unknown ID
- **THEN** the system returns `404 Not Found`

### Requirement: Shared types
The `@coqu/shared` package SHALL export updated types: `Project` (with `gitUrl`, `branch`, `status`, `statusMessage`, `hasGitToken`), `ProjectStatus` type (`"pending" | "cloning" | "ready" | "error"`), `CreateProjectRequest` (with `gitUrl?`, `branch?`, `gitToken?`).

#### Scenario: Types available in shared package
- **WHEN** the `@coqu/shared` package is built
- **THEN** all listed types are exported and usable by both `api` and `web` packages

### Requirement: Frontend project list with status
The Projects page SHALL display each project's clone status as a visual badge (pending: gray, cloning: blue/animated, ready: green, error: red).

#### Scenario: Project list shows status badges
- **WHEN** the user views the Projects page
- **THEN** each project card displays a status badge matching its current status

### Requirement: Frontend create project form
The "New Project" form SHALL include fields for name, description, git URL, and git token (password input). The git URL and git token fields SHALL be optional.

#### Scenario: Create project with git URL and token from UI
- **WHEN** the user fills in name, git URL, and git token and submits the form
- **THEN** the system creates the project and redirects to the projects list

### Requirement: Frontend project detail page
The system SHALL provide a project detail page at `/projects/:id` showing project info, clone status, a "Clone" button (when status is `pending` or `error`), and git token status.

#### Scenario: View project detail
- **WHEN** the user navigates to `/projects/:id`
- **THEN** the page displays project name, description, git URL, status badge, and whether a git token is configured

#### Scenario: Trigger clone from detail page
- **WHEN** the user clicks "Clone" on a project with status `pending`
- **THEN** the system calls `POST /api/projects/:id/clone`, the status badge changes to `cloning`, and the page polls for updates

#### Scenario: Poll during cloning
- **WHEN** a project status is `cloning`
- **THEN** the frontend polls `GET /api/projects/:id` every 3 seconds until status changes to `ready` or `error`

#### Scenario: Update git token from detail page
- **WHEN** the user enters a new git token and clicks "Save"
- **THEN** the system calls `PATCH /api/projects/:id` with the new token
