## ADDED Requirements

### Requirement: Structured logger module
The API SHALL provide a centralized logger module (`api/src/logger.ts`) built on Pino that writes structured NDJSON logs.

#### Scenario: Logger initialization
- **WHEN** the API server starts
- **THEN** the logger initializes with pino-roll transport writing to `{LOG_DIR}/app.{YYYY-MM-DD}.log`

#### Scenario: Default log directory
- **WHEN** `LOG_DIR` environment variable is not set
- **THEN** the logger writes to `./logs/` relative to the API working directory

### Requirement: Log levels
The logger SHALL support levels: info, warn, error. Each log entry SHALL include a numeric level (Pino standard: 30=info, 40=warn, 50=error).

#### Scenario: Logging at different levels
- **WHEN** code calls `logger.info(...)`, `logger.warn(...)`, or `logger.error(...)`
- **THEN** the log entry is written with the corresponding numeric level

### Requirement: Log categories
Each log entry SHALL include a `category` field. Supported categories: `auth`, `projects`, `agents`, `git`, `system`.

#### Scenario: Category in log entry
- **WHEN** a log is written with `{ category: "git" }`
- **THEN** the resulting JSON line contains `"category": "git"`

#### Scenario: Child logger with preset category
- **WHEN** code creates `logger.child({ category: "auth" })` and calls `.info(...)`
- **THEN** all entries from that child logger include `"category": "auth"`

### Requirement: Contextual fields
Log entries SHALL support optional contextual fields: `userId`, `projectId`, `agentId`.

#### Scenario: Log with project context
- **WHEN** code calls `logger.info({ category: "git", projectId: "abc" }, "Clone started")`
- **THEN** the JSON entry includes both `projectId` and `msg` fields

### Requirement: Daily log rotation
The logger SHALL create a new log file each day using pino-roll with `frequency: "daily"`.

#### Scenario: Day rollover
- **WHEN** a new calendar day begins
- **THEN** new log entries are written to a file named `app.{YYYY-MM-DD}.log`

### Requirement: Log retention cleanup
The system SHALL delete log files older than `LOG_RETENTION_DAYS` (default: 30). Cleanup runs on server startup and every 24 hours.

#### Scenario: Old logs deleted
- **WHEN** cleanup runs and a log file is older than the retention period
- **THEN** that file is deleted from the log directory

#### Scenario: Custom retention period
- **WHEN** `LOG_RETENTION_DAYS` is set to `7`
- **THEN** only logs from the last 7 days are retained

### Requirement: Instrument existing operations
The API SHALL log key events in existing handlers: auth (login, setup), projects (create, delete, clone start/finish/error), agents (create, install, delete), and system (server start).

#### Scenario: Login logged
- **WHEN** a user successfully logs in
- **THEN** an info log is written with category `auth` and the user's ID

#### Scenario: Clone error logged
- **WHEN** a git clone fails
- **THEN** an error log is written with category `git`, the project ID, and the error message
