# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

coqu (Code Query) — TypeScript monorepo with a React frontend, Express REST API, and PostgreSQL database. Uses Yarn workspaces. Strict TypeScript throughout.

## Commands

```bash
# Full dev environment (starts Postgres in Docker, then API + Web)
yarn dev

# Individual packages
yarn dev:api          # API at :4000
yarn dev:web          # Web at :3000

# Database (Postgres runs in Docker even for local dev)
yarn db:up            # Start container
yarn db:stop          # Stop container
yarn db:migrate       # Create + apply Prisma migration
yarn db:generate      # Regenerate Prisma Client
yarn db:studio        # Visual data editor

# Build
yarn build:shared     # Must build shared first (other packages depend on it)
yarn build            # Build all (shared → api → web)
```

No test framework is configured yet.

## Architecture

Three packages under `packages/`:

- **`shared`** — Pure TypeScript types (`ApiResponse<T>`, `User`, `HealthStatus`). No runtime deps. Both `api` and `web` depend on this. Must be built before other packages (`yarn build:shared`).
- **`api`** — Express server with Prisma ORM. Single entry point at `src/index.ts`. All routes defined there. Prisma schema at `prisma/schema.prisma`.
- **`web`** — React SPA via Vite. Dev server proxies `/api/*` and `/health` to the API (configured in `vite.config.ts`). In production, nginx handles proxying.

## Key Patterns

- All API responses use the `ApiResponse<T>` wrapper from `@coqu/shared` (`{ success, data?, error? }`)
- When adding a new API route: add types to `shared/src/index.ts`, add handler to `api/src/index.ts`, consume in `web/src/`
- When adding a DB model: define in `prisma/schema.prisma`, run `yarn db:migrate`, add corresponding type to `@coqu/shared`
- TypeScript project references with `composite: true` in shared for cross-package type checking
- Base TS config is `tsconfig.base.json` (target ES2022, strict, Node16 module resolution)

## Environment

Two `.env` files matter for local dev:

- **Root `.env`** (from `.env.example`) — Docker Compose reads this for container config
- **`packages/api/.env`** — Prisma reads `DATABASE_URL` here; must use `localhost` (not `postgres`) since Prisma runs on host

The `DATABASE_URL` host differs by context: `localhost` for local dev, `postgres` for Docker-to-Docker (production).

## Deployment

Production deploys automatically via GitHub Actions on push to `main` (self-hosted runner, `.github/workflows/deploy-prod.yml`). Docs deploy to GitHub Pages via MkDocs Material (`.github/workflows/docs.yml`).
