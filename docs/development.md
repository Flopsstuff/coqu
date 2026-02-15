# Development

## Prerequisites

- Node.js >= 20
- Yarn (via corepack — `corepack enable`)
- Docker and Docker Compose (for PostgreSQL)

## Quick start

```bash
# Clone and install dependencies
git clone <repo-url> && cd coqu
yarn install

# Create environment file
cp .env.example .env
# Edit .env and set JWT_SECRET (required for the API to start)

# Start everything (postgres in Docker + API + Web locally)
yarn dev
```

This command:
1. Starts PostgreSQL in a Docker container
2. Generates Prisma Client
3. Starts API at `http://localhost:4000`
4. Starts Web at `http://localhost:3000`

On first run, the web UI will show an **Initial Setup** page where you create the admin account.

Stop PostgreSQL:
```bash
yarn db:stop
```

## Running individual packages

```bash
# API only
yarn dev:api

# Web only
yarn dev:web
```

## Database

PostgreSQL runs in Docker even in dev mode.

### Environment files

There are two `.env` files relevant to the database:

| File | Read by | Purpose |
|------|---------|---------|
| `.env` (root) | Docker Compose | Container settings: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` |
| `packages/api/.env` | Prisma CLI | `DATABASE_URL` for local dev — connects to `localhost:<POSTGRES_PORT>` |

### `localhost` vs `postgres` host

The database always runs in Docker. The host in `DATABASE_URL` depends on **where the connecting code runs**:

| Who connects | Runs on | Host | Port |
|---|---|---|---|
| `yarn dev` / Prisma CLI / Studio | Host machine | `localhost` | `POSTGRES_PORT` (forwarded) |
| API container (`yarn docker:up`) | Inside Docker | `postgres` | `5432` (internal) |

- **Local dev** — the API and Prisma run on your machine, outside Docker. They reach the database through the forwarded port: `localhost:<POSTGRES_PORT>` → container's `5432`.
- **Production** — everything runs inside Docker Compose. Containers share an internal network and find each other by service name, so the API connects to `postgres:5432` directly (no port forwarding needed).

### First-time setup

1. Copy the root env file and adjust values if needed:
   ```bash
   cp .env.example .env
   ```

2. Create `packages/api/.env` with `DATABASE_URL` built from the values you set in the root `.env`:
   ```
   DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:<POSTGRES_PORT>/<POSTGRES_DB>
   ```
   For example, if your root `.env` contains:
   ```
   POSTGRES_USER=coqu
   POSTGRES_PASSWORD=coqu_secret
   POSTGRES_DB=coqu
   POSTGRES_PORT=5432
   ```
   Then `packages/api/.env` should be:
   ```
   DATABASE_URL=postgresql://coqu:coqu_secret@localhost:5432/coqu
   JWT_SECRET=change-me-in-production
   ```

   > **Important:** use `localhost` (not `postgres`) — Prisma runs on the host, not inside Docker.

3. Start PostgreSQL and apply migrations:
   ```bash
   yarn db:up
   yarn db:migrate
   ```

### Day-to-day workflow

```bash
# Start the database (if not already running)
yarn db:up

# Edit packages/api/prisma/schema.prisma, then:
yarn db:migrate    # creates and applies the migration (runs generate automatically)

# Browse/edit data in a GUI
yarn db:studio

# Stop the database
yarn db:stop
```

### All database commands

| Command | Description |
|---------|-------------|
| `yarn db:up` | Start PostgreSQL container |
| `yarn db:stop` | Stop PostgreSQL container |
| `yarn db:reset` | Remove PostgreSQL container and volume (destroys all data) |
| `yarn db:migrate` | Create and apply Prisma migration |
| `yarn db:generate` | Regenerate Prisma Client |
| `yarn db:studio` | Open Prisma Studio (visual data editor) |

### Changing the DB schema

1. Edit `packages/api/prisma/schema.prisma`
2. `yarn db:migrate` — creates and applies the migration (generate runs automatically)
3. Add the type to `@coqu/shared` if needed on the frontend

## Project structure

```
coqu/
├── packages/
│   ├── shared/              — shared types
│   │   └── src/index.ts
│   ├── api/                 — REST API
│   │   ├── src/index.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                 — React SPA
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── AuthContext.tsx
│       │   ├── Header.tsx
│       │   ├── api.ts
│       │   ├── index.css
│       │   └── pages/
│       │       ├── HomePage.tsx
│       │       ├── LoginPage.tsx
│       │       ├── SetupPage.tsx
│       │       └── TokensPage.tsx
│       ├── public/
│       │   └── favicon.svg
│       ├── index.html
│       └── vite.config.ts
├── docs/                    — documentation
├── docker-compose.yml
├── tsconfig.base.json
├── .env.example
└── package.json
```

## Ports

- `3000` — Web (Vite dev server)
- `4000` — API (Express)
- `5432` — PostgreSQL (default, configurable via `POSTGRES_PORT` in `.env`)

## Adding a new API route

1. Add types to `packages/shared/src/index.ts` (if needed on the frontend)
2. Add handler to `packages/api/src/index.ts`
3. Consume on the frontend in `packages/web/src/`

## Adding a DB model

1. Define the model in `packages/api/prisma/schema.prisma`
2. `yarn db:migrate`
3. Add the type to `@coqu/shared` if needed on the frontend
