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
- `User` — user entity interface
- `HealthStatus` — health check response interface

### @coqu/api

REST API built with Express.js. Default port: `4000`.

Stack:
- **Express** — HTTP server
- **Prisma** — PostgreSQL ORM
- **Helmet** — security headers
- **CORS** — cross-origin request handling

Routes:
- `GET /health` — service health check
- `GET /api/users` — list users
- `POST /api/users` — create user

### @coqu/web

React SPA built with Vite. In dev mode runs on port `3000` and proxies `/api/*` requests to the API server.

In production it is built into static files and served by nginx, which also handles API proxying.

## Package dependencies

```
web ──→ shared
api ──→ shared
```

TypeScript project references (`composite: true` in shared) ensure correct cross-package type checking.

## Database

PostgreSQL 16. ORM — Prisma.

Schema is defined in `packages/api/prisma/schema.prisma`. Migrations are managed via Prisma Migrate.

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
- `DATABASE_URL` — Prisma connection string
- `API_PORT` — API server port
- `VITE_API_URL` — API URL for Vite dev proxy
- `CLOUDFLARE_TUNNEL_TOKEN` — Cloudflare Tunnel token
