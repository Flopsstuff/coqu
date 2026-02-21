## ADDED Requirements

### Requirement: GET /api/logs endpoint
The API SHALL expose `GET /api/logs` (authenticated) that returns log entries from files with filtering and pagination.

#### Scenario: Fetch today's logs
- **WHEN** `GET /api/logs` is called without parameters
- **THEN** the response contains up to 100 log entries from today, newest first, wrapped in `ApiResponse<LogsResponse>`

#### Scenario: Filter by date
- **WHEN** `GET /api/logs?date=2026-02-20` is called
- **THEN** only entries from the file `app.2026-02-20.log` are returned

#### Scenario: Filter by level
- **WHEN** `GET /api/logs?level=error` is called
- **THEN** only entries with level >= 50 (error) are returned

#### Scenario: Filter by category
- **WHEN** `GET /api/logs?category=git` is called
- **THEN** only entries with `category: "git"` are returned

#### Scenario: Pagination
- **WHEN** `GET /api/logs?limit=20&offset=40` is called
- **THEN** up to 20 entries are returned, starting from the 41st newest entry

#### Scenario: Log file not found
- **WHEN** `GET /api/logs?date=2020-01-01` is called and no file exists for that date
- **THEN** the response returns an empty entries array with total=0

### Requirement: GET /api/logs/dates endpoint
The API SHALL expose `GET /api/logs/dates` (authenticated) that lists available log dates.

#### Scenario: List available dates
- **WHEN** `GET /api/logs/dates` is called
- **THEN** the response contains a list of dates (YYYY-MM-DD strings) for which log files exist, newest first

### Requirement: Shared types for logs
The `@coqu/shared` package SHALL export types: `LogEntry`, `LogLevel`, `LogCategory`, `LogsResponse`, `LogDatesResponse`.

#### Scenario: LogEntry type structure
- **WHEN** a consumer imports `LogEntry` from `@coqu/shared`
- **THEN** it includes fields: `level` (number), `time` (number), `msg` (string), `category` (LogCategory), and optional `userId`, `projectId`, `agentId`

#### Scenario: LogsResponse type structure
- **WHEN** a consumer imports `LogsResponse` from `@coqu/shared`
- **THEN** it includes: `entries` (LogEntry[]), `total` (number), `limit` (number), `offset` (number)
