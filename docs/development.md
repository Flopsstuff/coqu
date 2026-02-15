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

# Start everything (postgres in Docker + API + Web locally)
yarn dev
```

This command:
1. Starts PostgreSQL in a Docker container
2. Generates Prisma Client
3. Starts API at `http://localhost:4000`
4. Starts Web at `http://localhost:3000`

Stop PostgreSQL:
```bash
yarn dev:stop
```

## Running individual packages

```bash
# API only
yarn dev:api

# Web only
yarn dev:web
```

## Database

PostgreSQL runs in Docker even in dev mode. Default connection string:
```
postgresql://coqu:coqu_secret@localhost:5432/coqu
```

### Prisma commands

```bash
# Generate Prisma Client after changing schema.prisma
yarn db:generate

# Create and apply a migration
yarn db:migrate

# Open Prisma Studio (visual data editor)
yarn db:studio
```

### Changing the DB schema

1. Edit `packages/api/prisma/schema.prisma`
2. `yarn db:migrate` — creates and applies the migration
3. `yarn db:generate` — regenerates Prisma Client

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
│       │   └── App.tsx
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
- `5432` — PostgreSQL

## Adding a new API route

1. Add types to `packages/shared/src/index.ts` (if needed on the frontend)
2. Add handler to `packages/api/src/index.ts`
3. Consume on the frontend in `packages/web/src/`

## Adding a DB model

1. Define the model in `packages/api/prisma/schema.prisma`
2. `yarn db:migrate`
3. Add the type to `@coqu/shared` if needed on the frontend
