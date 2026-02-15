# coqu

Code Query — TypeScript monorepo with a web frontend, REST API, and PostgreSQL database.

## Stack

- **Frontend** — React + Vite
- **API** — Express + Prisma
- **Database** — PostgreSQL 16
- **Infrastructure** — Docker, Cloudflare Tunnel
- **Language** — TypeScript (strict)
- **Package manager** — Yarn (workspaces)

## Quick start

```bash
corepack enable
yarn install
cp .env.example .env
yarn dev
```

This starts PostgreSQL in Docker, then runs the API (`:4000`) and Web (`:3000`) locally.

## Docker

```bash
# Local
docker compose up --build

# With Cloudflare Tunnel
docker compose --profile tunnel up --build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
