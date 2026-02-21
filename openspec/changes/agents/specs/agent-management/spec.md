## ADDED Requirements

### Requirement: Agent data model
The `Agent` model SHALL include the following fields: `id` (UUID), `name` (string), `type` (string, one of: `claude-code`), `status` (string, one of: `pending`, `installing`, `installed`, `error`; default `pending`), `statusMessage` (nullable string), `version` (nullable string), `createdAt`, `updatedAt`. The Agent model SHALL NOT have a foreign key to Project.

#### Scenario: Agent schema after migration
- **WHEN** the database migration runs
- **THEN** the `Agent` table has all specified columns with correct types and defaults

#### Scenario: Agent type enum extensibility
- **WHEN** a new agent type needs to be supported
- **THEN** only the `type` field value needs to be extended (no schema changes)

### Requirement: Create agent
`POST /api/agents` SHALL accept `name` and `type` in the request body. The agent is created with status `pending`, then the system SHALL immediately start asynchronous installation of the agent SDK.

#### Scenario: Create Claude Code agent
- **WHEN** an authenticated user calls `POST /api/agents` with `{ "name": "My Claude", "type": "claude-code" }`
- **THEN** the system creates an agent with status `pending`, starts background installation, and returns `201 Created` with agent data

#### Scenario: Create agent with missing name
- **WHEN** an authenticated user calls `POST /api/agents` with no name
- **THEN** the system returns `400 Bad Request` with error "Agent name is required"

#### Scenario: Create agent with invalid type
- **WHEN** an authenticated user calls `POST /api/agents` with `{ "name": "Test", "type": "unknown" }`
- **THEN** the system returns `400 Bad Request` with error "Invalid agent type"

### Requirement: List agents
`GET /api/agents` SHALL return all agents ordered by `createdAt` descending.

#### Scenario: List agents
- **WHEN** an authenticated user calls `GET /api/agents`
- **THEN** the system returns all agents with their current status

### Requirement: Get single agent
`GET /api/agents/:id` SHALL return a single agent by ID.

#### Scenario: Get existing agent
- **WHEN** an authenticated user calls `GET /api/agents/:id` with a valid agent ID
- **THEN** the system returns the agent data including status and version

#### Scenario: Get non-existent agent
- **WHEN** an authenticated user calls `GET /api/agents/:id` with an unknown ID
- **THEN** the system returns `404 Not Found`

### Requirement: Update agent
`PATCH /api/agents/:id` SHALL allow updating the agent `name`.

#### Scenario: Update agent name
- **WHEN** an authenticated user calls `PATCH /api/agents/:id` with `{ "name": "New Name" }`
- **THEN** the system updates the name without affecting other fields

#### Scenario: Update non-existent agent
- **WHEN** an authenticated user calls `PATCH /api/agents/:id` with an unknown ID
- **THEN** the system returns `404 Not Found`

### Requirement: Delete agent
`DELETE /api/agents/:id` SHALL remove the agent record, uninstall the SDK globally (`npm uninstall -g`), and remove the agent's env directory.

#### Scenario: Delete existing agent
- **WHEN** an authenticated user calls `DELETE /api/agents/:id` for an existing agent
- **THEN** the system deletes the DB record, runs `npm uninstall -g` for the agent's package, removes `$HOME/.coqu/agents/<id>/`, and returns `{ success: true }`

#### Scenario: Delete agent during installation
- **WHEN** an authenticated user calls `DELETE /api/agents/:id` for an agent with status `installing`
- **THEN** the system kills the install process (if running), deletes the record, cleans up, and returns `{ success: true }`

#### Scenario: Delete non-existent agent
- **WHEN** an authenticated user calls `DELETE /api/agents/:id` with an unknown ID
- **THEN** the system returns `404 Not Found`

### Requirement: Agent SDK installation
When an agent is created, the system SHALL execute `npm install -g @anthropic-ai/claude-code` as a child process. The installation SHALL run asynchronously without blocking the API event loop. The agent status SHALL transition: `pending` → `installing` → `installed` or `error`.

#### Scenario: Installation succeeds
- **WHEN** `npm install -g @anthropic-ai/claude-code` exits with code 0
- **THEN** the system updates agent status to `installed`, detects and stores the installed version, and creates the env directory at `$HOME/.coqu/agents/<id>/`

#### Scenario: Installation fails
- **WHEN** `npm install -g @anthropic-ai/claude-code` exits with a non-zero code
- **THEN** the system updates agent status to `error` and sets `statusMessage` to the stderr output

#### Scenario: Installation timeout
- **WHEN** the npm install process runs for more than 5 minutes
- **THEN** the system kills the process, sets agent status to `error`, and sets `statusMessage` to "Installation timed out"

### Requirement: Reinstall agent
`POST /api/agents/:id/install` SHALL trigger a reinstallation of the agent SDK. The agent status SHALL reset to `installing`.

#### Scenario: Reinstall existing agent
- **WHEN** an authenticated user calls `POST /api/agents/:id/install`
- **THEN** the system sets status to `installing`, runs `npm install -g` in background, and returns `202 Accepted`

#### Scenario: Reinstall during active installation
- **WHEN** an authenticated user calls `POST /api/agents/:id/install` while agent status is `installing`
- **THEN** the system returns `409 Conflict` with error "Installation already in progress"

### Requirement: Agent health check at API startup
When the API starts, the system SHALL check all agents with status `installed` for the presence of their binary. If the binary is missing, the system SHALL automatically trigger reinstallation.

#### Scenario: Binary present at startup
- **WHEN** the API starts and an agent with status `installed` has its binary available (e.g., `which claude` succeeds)
- **THEN** the agent status remains `installed`

#### Scenario: Binary missing at startup
- **WHEN** the API starts and an agent with status `installed` has its binary missing (e.g., `which claude` fails)
- **THEN** the system sets status to `installing` and triggers `npm install -g` in background

#### Scenario: No agents in DB
- **WHEN** the API starts and no agents exist in the database
- **THEN** the startup health check completes without action

### Requirement: Agent env file management
The system SHALL provide `GET /api/agents/:id/env` and `PUT /api/agents/:id/env` endpoints for reading and writing agent env files. Env files SHALL be stored at `$HOME/.coqu/agents/<agent-id>/.env`.

#### Scenario: Read env file
- **WHEN** an authenticated user calls `GET /api/agents/:id/env` for an agent with an existing env file
- **THEN** the system returns `{ content: "<file contents>" }`

#### Scenario: Read env file when none exists
- **WHEN** an authenticated user calls `GET /api/agents/:id/env` for an agent with no env file
- **THEN** the system returns `{ content: "" }`

#### Scenario: Write env file
- **WHEN** an authenticated user calls `PUT /api/agents/:id/env` with `{ "content": "ANTHROPIC_API_KEY=sk-ant-..." }`
- **THEN** the system writes the content to `$HOME/.coqu/agents/<id>/.env` and returns `{ success: true }`

#### Scenario: Write env file creates directory
- **WHEN** an authenticated user calls `PUT /api/agents/:id/env` and the agent's env directory does not exist
- **THEN** the system creates the directory and writes the file

### Requirement: Docker volume for home directory
The production `docker-compose.yml` SHALL define a named volume `home_data` and mount it at `$HOME` (`/root` for alpine-based images) on the API service container.

#### Scenario: Home volume persists agent data
- **WHEN** the API container is stopped and restarted
- **THEN** all files in `$HOME/.coqu/agents/` and `$HOME/.claude/` are preserved

#### Scenario: Home volume available at start
- **WHEN** the API container starts via `docker-compose up`
- **THEN** the `$HOME` directory is available and writable inside the container

### Requirement: Shared types for agents
The `@coqu/shared` package SHALL export: `AgentType` (`"claude-code"`), `AgentStatus` (`"pending" | "installing" | "installed" | "error"`), `Agent` (with `id`, `name`, `type`, `status`, `statusMessage`, `version`, `createdAt`, `updatedAt`), `CreateAgentRequest` (with `name`, `type`), `UpdateAgentRequest` (with `name?`), `AgentEnv` (with `content`).

#### Scenario: Types available in shared package
- **WHEN** the `@coqu/shared` package is built
- **THEN** all listed types are exported and usable by both `api` and `web` packages

### Requirement: Frontend agents page
The system SHALL provide an agents list page at `/agents` displaying all agents with their name, type, status badge, and version.

#### Scenario: View agents list
- **WHEN** the user navigates to `/agents`
- **THEN** the page displays all agents with status badges (pending: gray, installing: blue/animated, installed: green, error: red)

#### Scenario: Navigate to create agent
- **WHEN** the user clicks "New Agent" on the agents page
- **THEN** the user is navigated to `/agents/new`

### Requirement: Frontend create agent form
The system SHALL provide a create agent form at `/agents/new` with fields for name and type (dropdown). Type defaults to `claude-code`.

#### Scenario: Create agent from form
- **WHEN** the user fills in name, selects type, and submits the form
- **THEN** the system creates the agent via API and redirects to the agents list

### Requirement: Frontend agent detail page
The system SHALL provide an agent detail page at `/agents/:id` showing agent info, status, version, and an env file editor (textarea with save button).

#### Scenario: View agent detail
- **WHEN** the user navigates to `/agents/:id`
- **THEN** the page displays agent name, type, status badge, version, and the env file editor

#### Scenario: Edit and save env file
- **WHEN** the user modifies the env textarea and clicks "Save"
- **THEN** the system calls `PUT /api/agents/:id/env` with the new content and shows a success confirmation

#### Scenario: Poll during installation
- **WHEN** an agent status is `installing`
- **THEN** the frontend polls `GET /api/agents/:id` every 3 seconds until status changes to `installed` or `error`

#### Scenario: Trigger reinstall from detail page
- **WHEN** the user clicks "Reinstall" on an agent with status `installed` or `error`
- **THEN** the system calls `POST /api/agents/:id/install`, the status badge changes to `installing`, and the page polls for updates

### Requirement: Frontend navigation
The Header component SHALL include a link to `/agents` in the navigation menu.

#### Scenario: Agents link in navigation
- **WHEN** the user views any page
- **THEN** the navigation menu includes an "Agents" link
