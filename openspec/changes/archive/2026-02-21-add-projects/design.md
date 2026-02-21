## Context

coqu is a TypeScript monorepo (Yarn workspaces) with an Express API, React SPA, and PostgreSQL. The API runs in Docker with Prisma ORM. A `Project` model already exists as a minimal stub (name, description, path) with basic CRUD routes and a simple frontend page.

The goal is to turn projects into real git-backed workspaces: each project is a cloned git repository living in a Docker volume accessible to the API container. Projects may be private, so the system needs to store a git PAT (Personal Access Token) per project to authenticate when cloning.

Current state:
- `Project` model: `id`, `name`, `description`, `path`, timestamps
- Two API routes: `GET /api/projects`, `POST /api/projects`
- Frontend: `ProjectsPage` (list), `NewProjectPage` (form with name/description/path)
- Docker: no workspace volume, only `postgres_data` volume

## Goals / Non-Goals

**Goals:**
- Mount a `workspace` Docker volume to the API container at a configurable path
- Extend Project model with git URL, branch, clone status, and encrypted git token (PAT)
- Clone git repos into `<WORKSPACE_PATH>/<project-id>/` via API call, using PAT for private repos
- Track clone status (pending → cloning → ready → error) with error messages
- Updated frontend: git URL + token in create form, status badges, project detail page
- Clean deletion: remove project directory from workspace when project is deleted

**Non-Goals:**
- Real-time clone progress streaming (WebSocket) — poll-based status is sufficient for v1
- Git operations beyond clone (pull, push, diff, commit) — future work
- SSH key auth — v1 supports HTTPS PATs only
- Multi-branch management — clone a single branch (default or specified)
- File browsing UI — the workspace is for backend/API consumption, not a file explorer
- Token rotation / refresh — user can update the token manually via the UI

## Decisions

### 1. Workspace volume approach

**Decision**: Named Docker volume `workspace_data` mounted at `/workspace` on the API container. `WORKSPACE_PATH` env var allows override (useful for local dev where it can point to a host directory).

**Alternatives considered:**
- Bind mount to host directory — simpler but less portable across environments
- Tmpfs — too ephemeral, data lost on restart

**Rationale**: Named volume is managed by Docker, persists across container restarts, works identically in dev/prod.

### 2. Git clone implementation

**Decision**: Use `child_process.execFile("git", ["clone", ...])` with spawn for async operation.

**Alternatives considered:**
- `simple-git` npm package — adds a dependency for something achievable with one `execFile` call
- `isomorphic-git` — pure JS but slower and less compatible with edge cases

**Rationale**: `git` binary is already available in the Node Docker image (or can be added with `apk add git` in Alpine). One `execFile` call keeps deps minimal. Clone runs asynchronously — the API starts the clone, sets status to `cloning`, and the process callback updates status to `ready` or `error`.

### 3. Clone status tracking

**Decision**: `status` enum field on `Project` model: `pending | cloning | ready | error`. Separate `statusMessage` text field for error details. Frontend polls `GET /api/projects/:id` to check status.

**Alternatives considered:**
- WebSocket/SSE for real-time updates — over-engineered for v1 where clones take seconds
- Background job queue (Bull, pg-boss) — too heavy; in-process spawn is sufficient

**Rationale**: Simple enum + poll is easy to implement and debug. Clone typically completes in seconds for reasonable repos.

### 4. Git PAT storage

**Decision**: Store the git PAT as an encrypted `gitToken` field on the `Project` model. Use AES-256-GCM symmetric encryption with a server-side key (`GIT_TOKEN_SECRET` env var). The encrypted value includes the IV and auth tag so it's self-contained.

When cloning, the PAT is decrypted and injected into the HTTPS URL: `https://<pat>@github.com/user/repo.git`. This works for GitHub, GitLab, and Bitbucket.

**Alternatives considered:**
- Store PAT in plaintext — unacceptable security practice
- Separate secrets store (Vault, AWS Secrets Manager) — over-engineered for v1
- Store PAT hashed — can't recover for use; hashing is for verification, not retrieval

**Rationale**: AES-256-GCM is standard, built into Node.js `crypto`, no dependencies. The encryption key lives in env, not in the DB. The PAT is never returned in API responses after initial storage — the API only returns a boolean `hasGitToken` flag.

### 5. Project directory structure

**Decision**: `<WORKSPACE_PATH>/<project-id>/` — use the UUID project ID as the directory name.

**Alternatives considered:**
- Slugified project name — risk of collisions, renaming issues
- Random subdirectory — harder to correlate with DB

**Rationale**: UUID is unique and immutable. No slug collision concerns.

### 6. Project deletion

**Decision**: Deleting a project via API removes the DB record and the workspace directory (`rm -rf <WORKSPACE_PATH>/<project-id>/`).

**Rationale**: Clean state. Orphaned directories waste disk.

## Risks / Trade-offs

- **Large repos block the event loop during clone** → Mitigation: `execFile` runs in a child process, does not block Node. Add a timeout (5 min default) to kill stuck clones.
- **Disk space exhaustion from many/large repos** → Mitigation: v1 accepts the risk. Future: add disk usage tracking and limits.
- **Concurrent clones for same project** → Mitigation: check status before starting clone; reject if already `cloning`.
- **PAT leaked in process args** → Mitigation: inject PAT into the URL passed to `git clone` via env var `GIT_ASKPASS` or a credential helper instead of embedding in the URL. For v1, URL injection is acceptable since process args are only visible to the same user/container. Future: use `GIT_ASKPASS`.
- **Git binary not in Docker image** → Mitigation: add `RUN apk add --no-cache git` to the API Dockerfile (Alpine-based).
- **GIT_TOKEN_SECRET not set** → Mitigation: API refuses to start without it (same pattern as JWT_SECRET).
