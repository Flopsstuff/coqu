# Deployment

## Overview

The application runs entirely in Docker and is exposed to the internet via a Cloudflare Tunnel. No open ports or public IP required on the host machine.

## Prerequisites

- Docker and Docker Compose
- A Cloudflare account with a domain
- `cloudflared` CLI (optional, for initial tunnel setup)

## Docker services

All services are defined in `docker-compose.yml`:

- **postgres** — PostgreSQL 16 database with a health check
- **api** — Express API server (Node 22 Alpine, multi-stage build, port 4000)
- **web** — React SPA served by nginx (`stable-alpine-slim`, port 80 internally, 3000 externally)
- **cloudflared** — Cloudflare Tunnel client (enabled via `tunnel` profile)

## Step-by-step

### 1. Prepare environment

```bash
cp .env.example .env
```

Edit `.env` and set production values for:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` (must match the postgres credentials above)
- `JWT_SECRET` — a strong random secret for signing auth tokens (required)
- `GIT_TOKEN_SECRET` — a strong random secret for encrypting git PATs at rest (required)
- `WORKSPACE_PATH` — root directory for cloned project repos (default: `/workspace`)
- `LOG_DIR` — directory for log files (default: `./logs`, which resolves to `/app/packages/api/logs/` in Docker)
- `LOG_RETENTION_DAYS` — days to keep log files before automatic deletion (default: `30`)

### 2. Set up Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) → Networks → Tunnels
2. Create a new tunnel (e.g. `coqu`)
3. Copy the tunnel token
4. Add it to `.env`:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=eyJh...
   ```
5. In the tunnel's **Public Hostname** settings, add:
   - Hostname: `your-domain.com` (or a subdomain)
   - Service: `http://web:80`

### 3. Deploy

```bash
# Start all services including the tunnel
docker compose --profile tunnel up --build -d
```

Database migrations are applied automatically on every container start (via `prisma migrate deploy` in the API Dockerfile entrypoint). No manual migration step is needed.

## Useful commands

```bash
# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f api

# Restart a service
docker compose restart api

# Stop everything
docker compose --profile tunnel down

# Rebuild and restart
docker compose --profile tunnel up --build -d
```

## Without Cloudflare Tunnel

If you want to expose the app differently (e.g. behind a reverse proxy):

```bash
docker compose up --build -d
```

This starts postgres, api, and web. Web is available at `http://localhost:3000`.

## Data persistence

Two named Docker volumes persist data across container restarts and rebuilds:

- **`postgres_data`** — PostgreSQL database files
- **`home_data`** — mounted at `/root` on the API container. Persists agent data (`~/.claude/`), the global environment file (`~/.coqu/.env`), and other home-directory state. This is required because agent SDKs are installed globally via `npm install -g` at runtime and their configuration lives in `$HOME`.

To reset all data:
```bash
docker compose down -v
```

**Warning:** `-v` deletes all volumes and all data (database, agent config, env file).

## CI/CD

### Production deployment

The workflow in `.github/workflows/deploy-prod.yml` automatically deploys on every push to `main`:

1. Checks out the repository on a **self-hosted runner**
2. Creates `.env` from the `ENV_FILE` repository secret
3. Stops the previous deployment
4. Builds and starts all services (including Cloudflare Tunnel)
5. Logs service status for debugging

### Documentation deployment

The workflow in `.github/workflows/docs.yml` deploys documentation to GitHub Pages when files in `docs/` or `mkdocs.yml` change on `main`. It can also be triggered manually via `workflow_dispatch`. The site is built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/).

## Updating (manual)

```bash
git pull
docker compose --profile tunnel up --build -d
```

Migrations are applied automatically on container start.
