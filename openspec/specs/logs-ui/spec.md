## ADDED Requirements

### Requirement: Logs page at /logs
The web app SHALL have a page at `/logs` accessible to authenticated users, showing backend log entries.

#### Scenario: Navigate to logs
- **WHEN** an authenticated user visits `/logs`
- **THEN** the page loads and displays log entries from today

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user visits `/logs`
- **THEN** they are redirected to `/login`

### Requirement: Logs navigation link
The header navigation SHALL include a "Logs" link pointing to `/logs`.

#### Scenario: Logs link in header
- **WHEN** the user is on any authenticated page
- **THEN** the header contains a "Logs" link between "Environment" and "API Tokens"

### Requirement: Log entries display
Each log entry SHALL display: timestamp (human-readable), level (colored badge), category (badge), message, and optional context fields.

#### Scenario: Entry rendering
- **WHEN** logs are loaded
- **THEN** each entry shows time, a colored level badge (green=info, yellow=warn, red=error), category badge, and message text

#### Scenario: Context fields shown
- **WHEN** a log entry has `projectId` or `userId`
- **THEN** those fields are shown as secondary text below the message

### Requirement: Filter controls
The logs page SHALL provide filter controls for: date picker, level selector, category selector.

#### Scenario: Filter by date
- **WHEN** the user selects a date in the date picker
- **THEN** the page fetches and displays logs for that date

#### Scenario: Filter by level
- **WHEN** the user selects "error" in the level filter
- **THEN** only error-level entries are shown

#### Scenario: Filter by category
- **WHEN** the user selects "git" in the category filter
- **THEN** only git-category entries are shown

### Requirement: Pagination
The logs page SHALL support pagination with "Load more" or page navigation when there are more entries than the page limit.

#### Scenario: Load more entries
- **WHEN** there are more entries than the current page shows
- **THEN** a "Load more" button or pagination control is available to fetch the next batch

### Requirement: Empty state
The logs page SHALL show a meaningful empty state when no logs match the current filters.

#### Scenario: No logs for date
- **WHEN** no log file exists for the selected date
- **THEN** the page shows "No logs for this date"

#### Scenario: No logs matching filters
- **WHEN** filters are active but no entries match
- **THEN** the page shows "No logs matching filters" with a way to clear filters
