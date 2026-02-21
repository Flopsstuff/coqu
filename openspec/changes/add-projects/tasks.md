## 1. Shared Types

- [x] 1.1 Add `ProjectStatus` type (`"pending" | "cloning" | "ready" | "error"`) to `@coqu/shared`
- [x] 1.2 Update `Project` interface: add `gitUrl`, `branch`, `status`, `statusMessage`, `hasGitToken` fields
- [x] 1.3 Update `CreateProjectRequest`: add optional `gitUrl`, `branch`, `gitToken`

## 2. Database Schema & Migration

- [x] 2.1 Add `gitUrl`, `branch`, `status` (default `pending`), `statusMessage`, `gitToken` (encrypted, nullable) fields to `Project` model in `schema.prisma`
- [x] 2.2 Run `yarn db:migrate` to create and apply migration

## 3. Environment & Docker Setup

- [x] 3.1 Add `workspace_data` named volume to `docker-compose.yml` and mount at `/workspace` on the `api` service
- [x] 3.2 Add `WORKSPACE_PATH` and `GIT_TOKEN_SECRET` env vars to `.env.example` and `docker-compose.yml` API environment
- [x] 3.3 Add `RUN apk add --no-cache git` to `packages/api/Dockerfile`
- [x] 3.4 Add startup validation: require `GIT_TOKEN_SECRET` env var (same pattern as `JWT_SECRET`)
- [x] 3.5 Add workspace directory initialization on API startup (read `WORKSPACE_PATH`, default `/workspace`, ensure dir exists via `mkdirSync`)

## 4. API — Git Token Encryption

- [x] 4.1 Implement `encryptToken(plaintext: string): string` using AES-256-GCM (IV + auth tag + ciphertext)
- [x] 4.2 Implement `decryptToken(encrypted: string): string`
- [x] 4.3 Read `GIT_TOKEN_SECRET` from env, derive 32-byte key

## 5. API — Enhanced Project CRUD

- [x] 5.1 Update `toProject` helper: include new fields, add `hasGitToken: boolean`, exclude `gitToken` raw value
- [x] 5.2 Update `POST /api/projects`: accept `gitUrl`, `branch`, `gitToken`; encrypt token before storage
- [x] 5.3 Add `GET /api/projects/:id` endpoint (single project by ID, 404 if not found)
- [x] 5.4 Add `PATCH /api/projects/:id` endpoint (update name, description, gitUrl, branch, gitToken)
- [x] 5.5 Add `DELETE /api/projects/:id` endpoint (delete DB record, remove workspace dir, kill active clone if any)

## 6. API — Git Clone

- [x] 6.1 Implement `cloneProject` function using `child_process.execFile("git", ["clone", ...])` with 5-min timeout
- [x] 6.2 If project has `gitToken`, decrypt and inject PAT into HTTPS URL
- [x] 6.3 Support optional `--branch <branch> --single-branch` when branch is set
- [x] 6.4 On success: update status to `ready`, set `path` to workspace dir, clear `statusMessage`
- [x] 6.5 On failure: update status to `error`, set `statusMessage` to stderr (scrub PAT from message)
- [x] 6.6 On timeout: kill process, set status to `error`, `statusMessage` to "Clone timed out"
- [x] 6.7 Add `POST /api/projects/:id/clone` endpoint with status guards (reject if `cloning`/`ready`, 400 if no `gitUrl`)

## 7. Frontend — Update Existing Pages

- [x] 7.1 Update `NewProjectPage`: replace path field with git URL field, add optional branch and git token (password input) fields
- [x] 7.2 Update `ProjectCard`: add status badge (gray=pending, blue/animated=cloning, green=ready, red=error)
- [x] 7.3 Update `ProjectList` / `ProjectsPage` to show status badges

## 8. Frontend — Project Detail Page

- [x] 8.1 Create `ProjectDetailPage` component at route `/projects/:id`
- [x] 8.2 Show project info: name, description, git URL, branch, status badge, git token status (configured / not configured)
- [x] 8.3 Add "Clone" button (visible when status is `pending` or `error`), calls `POST /api/projects/:id/clone`
- [x] 8.4 Implement polling: when status is `cloning`, poll `GET /api/projects/:id` every 3 seconds
- [x] 8.5 Add git token update form (password input + save button), calls `PATCH /api/projects/:id`
- [x] 8.6 Add "Delete Project" button with confirmation
- [x] 8.7 Add route to `App.tsx` for `/projects/:id`
