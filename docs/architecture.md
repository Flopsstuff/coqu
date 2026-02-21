# Architecture

## Overview

coqu is a TypeScript monorepo (yarn workspaces) consisting of three packages:

```
packages/
├── shared/   — shared types and utilities
├── api/      — REST API (Express + Prisma)
└── web/      — web interface (React + Vite)
```

## Packages

### @coqu/shared

Shared TypeScript types used by both API and Web. No runtime dependencies.

Exports:
- `ApiResponse<T>` — wrapper for all API responses
- `User` — user entity interface (safe — no `passwordHash`)
- `UserRole` — user role type (`"admin"`)
- `HealthStatus` — health check response interface
- `AuthStatus` — whether initial setup is needed
- `LoginRequest` — login payload
- `SetupRequest` — initial admin setup payload
- `AuthResponse` — token + user returned on login/setup
- `ApiToken` — API token entity (safe — no hash, no userId)
- `CreateTokenRequest` — create-token payload (`{ name }`)
- `CreateTokenResponse` — raw token + token metadata (token shown once)
- `PingResponse` — ping endpoint response
- `QueryRequest` — query submission payload (`{ query }`)
- `QueryResponse` — query result (`{ query, result, timestamp }`)
- `ProjectStatus` — project lifecycle status (`"pending" | "cloning" | "ready" | "error"`)
- `Project` — project entity interface (includes `hasGitToken` boolean instead of the raw token)
- `CreateProjectRequest` — project creation payload (name, optional gitUrl/branch/gitToken)
- `BranchListResponse` — current branch + list of all branches
- `CommitInfoResponse` — latest commit hash + message

### @coqu/api

REST API built with Express.js. Default port: `4000`.

Stack:
- **Express** — HTTP server
- **Prisma** — PostgreSQL ORM
- **Helmet** — security headers
- **CORS** — cross-origin request handling
- **jsonwebtoken** — JWT-based authentication
- **bcryptjs** — password hashing

Authentication supports two schemes (both via `Authorization: Bearer <token>`):

1. **JWT** — issued on login/setup, expires after 7 days. Used by the web SPA.
2. **API tokens** — personal tokens for programmatic access. Format: `coqu_` prefix + 64 hex chars. Stored as SHA-256 hashes in the database. `lastUsedAt` is updated on each use.

Both `JWT_SECRET` and `GIT_TOKEN_SECRET` environment variables are required — the server will refuse to start without them.

The `requireAuth` middleware tries JWT verification first (no DB hit); on failure it hashes the bearer value and looks up an `ApiToken` record.

On first launch (no users in the database), the app enters a setup flow where the initial admin account is created via `POST /api/auth/setup`.

Routes:
- `GET /health` — service health check
- `GET /api/auth/status` — returns `{ needsSetup: boolean }`
- `POST /api/auth/setup` — create initial admin account (only works when no users exist)
- `POST /api/auth/login` — authenticate with email + password, returns JWT
- `GET /api/auth/me` — get current user (requires auth)
- `GET /api/users` — list users (requires auth)
- `POST /api/users` — create user (requires auth)
- `GET /api/tokens` — list current user's API tokens (requires auth)
- `POST /api/tokens` — create a new API token, returns raw value once (requires auth)
- `DELETE /api/tokens/:id` — delete an API token with ownership check (requires auth)
- `GET /api/ping` — returns `{ message: "pong", timestamp, userId }` (requires auth)
- `POST /api/query` — submit a query, returns dummy result after 3–5 s delay (requires auth)
- `GET /api/projects` — list all projects (requires auth)
- `POST /api/projects` — create a project (requires auth)
- `GET /api/projects/:id` — get a single project (requires auth)
- `PATCH /api/projects/:id` — update project fields (requires auth)
- `DELETE /api/projects/:id` — delete project and its workspace directory (requires auth)
- `POST /api/projects/:id/clone` — start async git clone, returns 202 (requires auth)
- `GET /api/projects/:id/branches` — list local + remote branches (requires auth, project must be `ready`)
- `POST /api/projects/:id/checkout` — switch branch via `git checkout` (requires auth)
- `GET /api/projects/:id/commit` — get latest commit hash and message (requires auth)
- `POST /api/projects/:id/pull` — pull latest changes from origin (requires auth)

Git tokens (PATs) are encrypted at rest using AES-256-GCM with a key derived from `GIT_TOKEN_SECRET`. The token is injected into the clone URL at clone time and scrubbed from any error messages. Cloned repositories are stored under `WORKSPACE_PATH` (default `/workspace`), each in a directory named by the project's UUID.

### @coqu/web

React SPA built with Vite. In dev mode runs on port `3000` and proxies `/api/*` requests to the API server.

Uses `react-router-dom` for client-side routing with seven pages:
- **SetupPage** — shown when no admin account exists yet
- **LoginPage** — email/password sign-in
- **HomePage** — main dashboard with query interface and API health status
- **TokensPage** — API token management (create, list, delete)
- **ProjectsPage** — project list with status badges, branch, and path info
- **NewProjectPage** — create a project (name, description, git URL, branch, git token)
- **ProjectDetailPage** — project info, clone/pull/delete actions, branch switcher, commit info

A shared `Header` component (`Header.tsx`) renders the navigation bar on all authenticated pages, including the logo/favicon, navigation links (with active-state highlighting for the current page), user name, and logout button.

Auth state is managed via `AuthContext` (React context). JWT tokens are stored in `localStorage`. An `apiFetch` helper in `api.ts` automatically attaches the Bearer token to requests.

In production it is built into static files and served by nginx (`stable-alpine-slim`), which also handles API proxying.

## Package dependencies

```
web ──→ shared
api ──→ shared
```

TypeScript project references (`composite: true` in shared) ensure correct cross-package type checking.

## Database

PostgreSQL 16. ORM — Prisma.

Schema is defined in `packages/api/prisma/schema.prisma`. Migrations are managed via Prisma Migrate and committed to the repository (`packages/api/prisma/migrations/`). In production, `prisma migrate deploy` runs automatically on container start.

Models:
- **User** — admin accounts (email, name, passwordHash, role)
- **ApiToken** — personal API tokens (hashed, linked to User)
- **Project** — git-backed projects (name, gitUrl, branch, status, encrypted gitToken, workspace path)

## Network architecture (Docker)

```
Internet
  │
  ▼
cloudflared (Cloudflare Tunnel)
  │
  ▼
web (nginx :80)
  ├── /           → React static files
  ├── /api/*      → proxy → api:4000
  └── /health     → proxy → api:4000
                              │
                              ▼
                          postgres:5432
```

Single domain, single entry point. Nginx routes traffic between static files and API based on URL path.

## Environment variables

Defined in `.env` (template — `.env.example`):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — PostgreSQL credentials
- `POSTGRES_PORT` — PostgreSQL port (default: `5432`)
- `DATABASE_URL` — Prisma connection string
- `API_PORT` — API server port
- `JWT_SECRET` — secret key for signing JWT auth tokens (required, no default)
- `GIT_TOKEN_SECRET` — secret key for encrypting git PATs at rest (required, no default)
- `WORKSPACE_PATH` — root directory for cloned project repos (default: `/workspace`)
- `VITE_API_URL` — API URL for Vite dev proxy
- `CLOUDFLARE_TUNNEL_TOKEN` — Cloudflare Tunnel token
