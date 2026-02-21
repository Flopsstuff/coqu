## 1. Shared types

- [ ] 1.1 Add `AgentType`, `AgentStatus`, `Agent`, `CreateAgentRequest`, `UpdateAgentRequest`, `AgentEnv` types to `packages/shared/src/index.ts`
- [ ] 1.2 Build shared package (`yarn build:shared`)

## 2. Database

- [ ] 2.1 Add `Agent` model to `packages/api/prisma/schema.prisma` (id, name, type, status, statusMessage, version, createdAt, updatedAt)
- [ ] 2.2 Run `yarn db:migrate` to create and apply migration

## 3. Docker

- [ ] 3.1 Add `home_data` named volume to `docker-compose.yml`
- [ ] 3.2 Mount `home_data` at `/root` on the API service container

## 4. API — Agent CRUD

- [ ] 4.1 Add `toAgent` helper function for Prisma → shared type mapping
- [ ] 4.2 Implement `GET /api/agents` — list all agents
- [ ] 4.3 Implement `POST /api/agents` — create agent with validation (name required, valid type), trigger async installation
- [ ] 4.4 Implement `GET /api/agents/:id` — get single agent
- [ ] 4.5 Implement `PATCH /api/agents/:id` — update agent name
- [ ] 4.6 Implement `DELETE /api/agents/:id` — delete agent, kill active install if running, npm uninstall -g, remove env dir

## 5. API — Agent installation service

- [ ] 5.1 Implement `installAgent` function — `npm install -g @anthropic-ai/claude-code` via `execFile`, status transitions (pending → installing → installed/error), 5min timeout, version detection
- [ ] 5.2 Track active install processes (Map) for cleanup on delete
- [ ] 5.3 Implement `POST /api/agents/:id/install` — reinstall endpoint (409 if already installing)

## 6. API — Health check at startup

- [ ] 6.1 On API start: query all agents with status `installed`, run `which claude` for each, trigger reinstall if binary missing

## 7. API — Env file management

- [ ] 7.1 Implement `GET /api/agents/:id/env` — read `$HOME/.coqu/agents/<id>/.env`, return empty string if not exists
- [ ] 7.2 Implement `PUT /api/agents/:id/env` — write content to env file, create directory if needed

## 8. Frontend — Agents list page

- [ ] 8.1 Add `AgentsPage` component at `/agents` — fetch and display agents list with status badges
- [ ] 8.2 Add agent status badge component (pending: gray, installing: blue/animated, installed: green, error: red)
- [ ] 8.3 Add "New Agent" button linking to `/agents/new`

## 9. Frontend — Create agent page

- [ ] 9.1 Add `NewAgentPage` component at `/agents/new` — form with name input and type dropdown (default: claude-code)
- [ ] 9.2 Submit calls `POST /api/agents`, redirect to agents list on success

## 10. Frontend — Agent detail page

- [ ] 10.1 Add `AgentDetailPage` component at `/agents/:id` — show agent info, status badge, version
- [ ] 10.2 Add env file editor (textarea + save button), load via `GET /api/agents/:id/env`, save via `PUT /api/agents/:id/env`
- [ ] 10.3 Add polling during `installing` status (every 3s until installed/error)
- [ ] 10.4 Add "Reinstall" button calling `POST /api/agents/:id/install`
- [ ] 10.5 Add "Delete" button with confirmation

## 11. Frontend — Navigation

- [ ] 11.1 Add "Agents" link to Header component
- [ ] 11.2 Add routes `/agents`, `/agents/new`, `/agents/:id` to `App.tsx`
