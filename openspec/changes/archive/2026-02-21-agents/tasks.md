## 1. Shared types

- [x] 1.1 Add `AgentType`, `AgentStatus`, `Agent`, `CreateAgentRequest`, `UpdateAgentRequest`, `AgentEnv` types to `packages/shared/src/index.ts`
- [x] 1.2 Build shared package (`yarn build:shared`)

## 2. Database

- [x] 2.1 Add `Agent` model to `packages/api/prisma/schema.prisma` (id, name, type, status, statusMessage, version, createdAt, updatedAt)
- [x] 2.2 Run `yarn db:migrate` to create and apply migration

## 3. Docker

- [x] 3.1 Add `home_data` named volume to `docker-compose.yml`
- [x] 3.2 Mount `home_data` at `/root` on the API service container

## 4. API — Agent CRUD

- [x] 4.1 Add `toAgent` helper function for Prisma → shared type mapping
- [x] 4.2 Implement `GET /api/agents` — list all agents
- [x] 4.3 Implement `POST /api/agents` — create agent with validation (name required, valid type), trigger async installation
- [x] 4.4 Implement `GET /api/agents/:id` — get single agent
- [x] 4.5 Implement `PATCH /api/agents/:id` — update agent name
- [x] 4.6 Implement `DELETE /api/agents/:id` — delete agent, kill active install if running, npm uninstall -g

## 5. API — Agent installation service

- [x] 5.1 Implement `installAgent` function — `npm install -g @anthropic-ai/claude-code` via `execFile`, status transitions (pending → installing → installed/error), 5min timeout, version detection
- [x] 5.2 Track active install processes (Map) for cleanup on delete
- [x] 5.3 Implement `POST /api/agents/:id/install` — reinstall endpoint (409 if already installing)

## 6. API — Health check at startup

- [x] 6.1 On API start: query all agents with status `installed`, run `which claude` for each, trigger reinstall if binary missing

## 7. API — Global env file management

- [x] 7.1 Implement `GET /api/env` — read `$HOME/.coqu/.env`, return empty string if not exists
- [x] 7.2 Implement `PUT /api/env` — write content to `$HOME/.coqu/.env`, create directory if needed

## 8. Frontend — Agents list page

- [x] 8.1 Add `AgentsPage` component at `/agents` — fetch and display agents list with status badges
- [x] 8.2 Add agent status badge component (pending: gray, installing: blue/animated, installed: green, error: red)
- [x] 8.3 Add "New Agent" button linking to `/agents/new`

## 9. Frontend — Create agent page

- [x] 9.1 Add `NewAgentPage` component at `/agents/new` — form with name input and type dropdown (default: claude-code)
- [x] 9.2 Submit calls `POST /api/agents`, redirect to agents list on success

## 10. Frontend — Agent detail page

- [x] 10.1 Add `AgentDetailPage` component at `/agents/:id` — show agent info, status badge, version
- [x] 10.2 Add polling during `installing` status (every 3s until installed/error)
- [x] 10.3 Add "Reinstall" button calling `POST /api/agents/:id/install`
- [x] 10.4 Add "Delete" button with confirmation

## 11. Frontend — Global env page

- [x] 11.1 Add `EnvPage` component at `/env` — textarea + save button, load via `GET /api/env`, save via `PUT /api/env`
- [x] 11.2 Add "Environment" link to Header component
- [x] 11.3 Add route `/env` to `App.tsx` with auth guards

## 12. Frontend — Navigation

- [x] 12.1 Add "Agents" link to Header component
- [x] 12.2 Add routes `/agents`, `/agents/new`, `/agents/:id` to `App.tsx`
