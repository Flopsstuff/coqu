## 1. Shared Types

- [x] 1.1 Add `LogLevel`, `LogCategory`, `LogEntry`, `LogsResponse`, `LogDatesResponse` types to `packages/shared/src/index.ts`
- [x] 1.2 Build shared package (`yarn build:shared`)

## 2. Logger Module

- [x] 2.1 Add `pino` and `pino-roll` dependencies to `packages/api`
- [x] 2.2 Create `packages/api/src/logger.ts` with Pino + pino-roll transport (daily rotation, configurable LOG_DIR)
- [x] 2.3 Implement log retention cleanup function (delete files older than LOG_RETENTION_DAYS)
- [x] 2.4 Run cleanup on server startup and schedule every 24h in `index.ts`

## 3. Instrument Existing Operations

- [x] 3.1 Add auth logging: login success/failure, setup
- [x] 3.2 Add project logging: create, delete, clone start/success/error
- [x] 3.3 Add agent logging: create, install success/error, delete
- [x] 3.4 Add system logging: server start
- [x] 3.5 Replace existing `console.log` calls with structured logger calls

## 4. Logs API Endpoints

- [x] 4.1 Add `GET /api/logs` endpoint with query params: date, level, category, limit, offset
- [x] 4.2 Implement NDJSON file reading with stream-based line parsing and reverse ordering
- [x] 4.3 Add `GET /api/logs/dates` endpoint returning available log file dates

## 5. Web UI — Logs Page

- [x] 5.1 Create `packages/web/src/pages/LogsPage.tsx` with log entries display
- [x] 5.2 Add filter controls: date picker, level selector, category selector
- [x] 5.3 Add pagination ("Load more" button)
- [x] 5.4 Style log entries: colored level badges, category badges, context fields
- [x] 5.5 Add empty state for no logs / no matching filters

## 6. Web UI — Integration

- [x] 6.1 Add `/logs` route to `App.tsx` (authenticated)
- [x] 6.2 Add "Logs" link to `Header.tsx` navigation
- [x] 6.3 Add Vite proxy rule for `/api/logs` if needed (already covered by `/api` proxy)

## 7. Configuration & Cleanup

- [x] 7.1 Add `LOG_DIR` and `LOG_RETENTION_DAYS` to `.env.example` with defaults
- [x] 7.2 Add `logs/` to `.gitignore` (already present as `/logs` and `*.log`)
