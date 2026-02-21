## Context

coqu — TypeScript монорепо (React + Express + Postgres). Проекты хранят клонированные git-репозитории в `/workspace/<id>/`. API работает в Docker-контейнере на базе `node:22-alpine`. Все роуты определены в одном файле `packages/api/src/index.ts`. Текущая модель данных: `User`, `ApiToken`, `Project`.

Нужно добавить сущность «Агент» — независимый от проектов объект, представляющий AI-агента (пока только Claude Code). Агент устанавливается глобально в контейнер, конфигурируется через env-файлы, в перспективе взаимодействует с проектами.

## Goals / Non-Goals

**Goals:**
- CRUD для агентов (модель, API, фронтенд)
- Установка/удаление `@anthropic-ai/claude-code` глобально через API (npm install -g)
- Health check при старте API — автопереустановка отсутствующих агентов
- Страница управления агентами с редактором env-файла
- Volume `home_data` для персистенции `$HOME` контейнера (данные агентов)
- Расширяемость: модель поддерживает разные типы агентов

**Non-Goals:**
- Q&A функционал (запуск агента, отправка вопросов, получение ответов)
- Привязка агентов к проектам (связь M:N — в будущем)
- Обновление версий агентов (в будущем)
- Шифрование env-переменных (хранятся в файлах на volume)

## Decisions

### 1. Модель данных: Agent как независимая сущность

Таблица `Agent` без FK на `Project`. Поля: `id`, `name`, `type` (enum: `claude-code`), `status` (enum: `pending`, `installing`, `installed`, `error`), `statusMessage`, `version`, `envFilePath`, `createdAt`, `updatedAt`.

**Альтернатива**: Agent привязан к Project (1:N или M:N). Отвергнуто — агенты являются инфраструктурными компонентами, в перспективе один агент работает с любым проектом.

### 2. Установка через npm install -g в рантайме

Бэкенд выполняет `npm install -g @anthropic-ai/claude-code` через `execFile` при создании агента. Статус меняется: `pending` → `installing` → `installed` / `error`.

**Альтернатива**: Установка в Dockerfile. Отвергнуто — пользователь должен контролировать установку через интерфейс, без пересборки образа.

**Альтернатива**: Установка в volume. Отвергнуто — проще использовать стандартный npm global path, а при рестарте контейнера автоматически переустановить.

### 3. Health check при старте API

При старте API: для каждого агента со статусом `installed` проверяем наличие бинарника (`which claude`). Если отсутствует — запускаем `npm install -g` и обновляем статус. Это покрывает сценарий пересоздания контейнера.

### 4. Env-переменные в файлах на volume

Каждый агент имеет env-файл по пути `$HOME/.coqu/agents/<agent-id>/.env`. API предоставляет эндпоинты `GET/PUT /api/agents/:id/env` для чтения/записи. Фронтенд показывает текстовый редактор. Файлы персистятся через volume `home_data` → `$HOME`.

**Альтернатива**: Хранение env в БД с шифрованием AES-256-GCM. Отвергнуто — env-файлы проще, child_process их подхватит естественно, а шифрование избыточно для файлов внутри контейнера.

### 5. Volume home_data для $HOME

Новый named volume `home_data` в `docker-compose.yml`, монтируется в `$HOME` (`/root` для alpine). Персистит: данные агентов (`~/.claude/`), env-файлы (`~/.coqu/agents/`), любые другие данные home-директории.

### 6. API-эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/agents` | Список всех агентов |
| POST | `/api/agents` | Создать агента (запускает установку) |
| GET | `/api/agents/:id` | Получить агента |
| PATCH | `/api/agents/:id` | Обновить имя/настройки |
| DELETE | `/api/agents/:id` | Удалить (+ npm uninstall -g) |
| POST | `/api/agents/:id/install` | Переустановить агента |
| GET | `/api/agents/:id/env` | Прочитать env-файл |
| PUT | `/api/agents/:id/env` | Записать env-файл |

### 7. Фронтенд: страница Agents

Новые роуты:
- `/agents` — список агентов (AgentsPage)
- `/agents/new` — форма создания (NewAgentPage)
- `/agents/:id` — детали + редактор env-файла (AgentDetailPage)

Ссылка в навигации (Header). Паттерн аналогичен проектам: список → карточка → деталь.

### 8. Shared-типы

```
AgentType = "claude-code"
AgentStatus = "pending" | "installing" | "installed" | "error"
Agent = { id, name, type, status, statusMessage, version, createdAt, updatedAt }
CreateAgentRequest = { name, type }
UpdateAgentRequest = { name? }
AgentEnv = { content: string }
```

## Risks / Trade-offs

- **[Потеря бинарников при рестарте]** → Health check при старте API переустановит. Задержка старта ~30-60с на установку.
- **[npm install -g требует сеть]** → Контейнер должен иметь доступ к npm registry. При отсутствии сети агент останется в статусе `error`.
- **[Env-файлы не зашифрованы]** → API-ключи хранятся plaintext на volume. Приемлемо для self-hosted, доступ ограничен контейнером. В будущем можно добавить шифрование.
- **[$HOME volume может накапливать мусор]** → Со временем данные агентов растут. Решение: в будущем добавить cleanup-функционал.
- **[Один тип агента]** → Модель поддерживает enum `AgentType`, но пока только `claude-code`. Расширение — добавить значение в enum + логику установки.
