## ADDED Requirements

### Requirement: Git token field on Project model
The `Project` model SHALL include an optional `gitToken` field that stores an encrypted git PAT (Personal Access Token). The token is encrypted with AES-256-GCM using a server-side key from `GIT_TOKEN_SECRET` env var.

#### Scenario: Project created with git token
- **WHEN** a project is created with a `gitToken` value
- **THEN** the system encrypts the token using AES-256-GCM and stores the ciphertext (including IV and auth tag) in the `gitToken` column

#### Scenario: Project created without git token
- **WHEN** a project is created without a `gitToken`
- **THEN** the `gitToken` field is null

### Requirement: Git token encryption
The system SHALL encrypt git tokens using AES-256-GCM with Node.js `crypto` module. The `GIT_TOKEN_SECRET` env var SHALL provide the encryption key. The stored value SHALL include the IV and auth tag concatenated with the ciphertext so decryption is self-contained.

#### Scenario: Encrypt and decrypt round-trip
- **WHEN** a PAT `ghp_abc123` is encrypted and then decrypted
- **THEN** the decrypted value equals `ghp_abc123`

#### Scenario: GIT_TOKEN_SECRET not set
- **WHEN** the API starts without `GIT_TOKEN_SECRET` defined
- **THEN** the API refuses to start and logs an error message

### Requirement: Git token never exposed in API responses
The API SHALL never return the raw or encrypted `gitToken` in any response. Instead, the API SHALL return a boolean `hasGitToken` field indicating whether a token is stored.

#### Scenario: Get project with token set
- **WHEN** an authenticated user calls `GET /api/projects/:id` for a project with a stored git token
- **THEN** the response includes `hasGitToken: true` and does NOT include `gitToken`

#### Scenario: Get project without token
- **WHEN** an authenticated user calls `GET /api/projects/:id` for a project with no git token
- **THEN** the response includes `hasGitToken: false`

### Requirement: Update git token
The system SHALL allow updating the git token via `PATCH /api/projects/:id` with a `gitToken` field. Setting `gitToken` to an empty string or null SHALL remove the stored token.

#### Scenario: Update git token
- **WHEN** an authenticated user calls `PATCH /api/projects/:id` with `{ "gitToken": "ghp_newtoken" }`
- **THEN** the system encrypts and stores the new token, replacing the old one

#### Scenario: Remove git token
- **WHEN** an authenticated user calls `PATCH /api/projects/:id` with `{ "gitToken": "" }`
- **THEN** the system sets `gitToken` to null

### Requirement: Git token used for clone authentication
When cloning a project that has a `gitToken`, the system SHALL inject the decrypted PAT into the HTTPS git URL for authentication.

#### Scenario: Clone private repo with PAT
- **WHEN** a clone is initiated for a project with `gitUrl: "https://github.com/user/private-repo.git"` and a stored git token
- **THEN** the system clones using the URL `https://<decrypted-pat>@github.com/user/private-repo.git`

#### Scenario: Clone public repo without PAT
- **WHEN** a clone is initiated for a project with no git token
- **THEN** the system clones using the original `gitUrl` without modification
