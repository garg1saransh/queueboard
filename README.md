# Queueboard

Durable async batch processing console: submit a batch, process items in the background, watch live progress, and retry failed items individually.

## Overview

Users submit a batch size **N**. The API creates one parent `Job` and **N** `JobItem` rows in PostgreSQL, enqueues each item on a BullMQ queue in Redis, and a dedicated worker process handles each item asynchronously. The dashboard loads persisted state from the database, then receives incremental Socket.IO updates—**no full-list polling**.

## Architecture

```mermaid
flowchart TB
  Browser["Browser"]
  Web["Next.js UI + API + Socket.IO\n(custom Node server)"]
  PG[(PostgreSQL)]
  Redis[(Redis)]
  Worker["Worker process"]

  Browser -->|REST| Web
  Browser -->|Socket.IO| Web
  Web -->|Prisma CRUD| PG
  Web -->|enqueue| Redis
  Redis -->|BullMQ jobs| Worker
  Worker -->|status updates| PG
  Worker -->|publish events| Redis
  Redis -->|pub/sub relay| Web
  Web -->|job:item-updated / job:updated| Browser
```

| Process | Responsibility |
|---------|----------------|
| **Web (`server.ts`)** | Next.js App Router UI/API + Socket.IO server |
| **Worker (`worker/index.ts`)** | Consumes BullMQ jobs; never depends on browser state |
| **PostgreSQL** | Source of truth for job/item business state |
| **Redis** | BullMQ queue state + pub/sub bridge for realtime events |

The worker updates PostgreSQL **first**, then publishes a Redis event. The web process relays that event over Socket.IO. Clients that miss an event recover by refreshing—the page reloads state from PostgreSQL.

> **Why a custom server?** Socket.IO needs a long-lived Node process. This avoids assuming Vercel serverless functions can host websocket servers or BullMQ workers.

## Data Model

### Job
Parent batch record: `status`, `totalCount`, `completedCount`, `failedCount`, timestamps.

### JobItem
Individual unit of work: `itemNumber`, `status`, `attempts`, optional `errorMessage` / `startedAt` / `completedAt`.

Aggregates `completedCount` / `failedCount` live on `Job` and are updated atomically in transactions. Pending/processing counts are derived from item status (not duplicated as writable fields).

### Status model choice

**Items:** `PENDING → PROCESSING → COMPLETED | FAILED`

**Jobs:** `PENDING → PROCESSING → COMPLETED | COMPLETED_WITH_ERRORS`

A job becomes terminal when `completedCount + failedCount === totalCount`:

- all succeeded → `COMPLETED`
- any failures → `COMPLETED_WITH_ERRORS`

User retry of a failed item resets that **same** `JobItem` to `PENDING`, decrements `failedCount`, sets the job back to `PROCESSING`, and re-enqueues the item. No new parent job or item row is created.

## Job Lifecycle

1. Validate `count` with Zod (1–100).
2. Transactionally create `Job` + N `JobItem`s.
3. Bulk-enqueue `{ jobItemId }` payloads to BullMQ.
4. Worker claims a `PENDING` item → `PROCESSING` (increments `attempts`).
5. Simulated work (1–5s) randomly succeeds or fails.
6. Worker updates item + parent aggregates in a transaction, then emits realtime events.
7. When all items settle, parent status becomes `COMPLETED` or `COMPLETED_WITH_ERRORS`.

## Realtime Updates

Socket.IO pushes `job:item-updated` and `job:updated` to room `job:{jobId}`.

This is used instead of polling the full job list every second because:

- it scales better under many concurrent viewers
- the UI patches only changed rows/aggregates
- PostgreSQL remains authoritative on reconnect/refresh

## Retry Behavior

| Kind | Meaning |
|------|---------|
| **BullMQ retries** | Infrastructure/transient failures (e.g. worker crash mid-handler throw). Configured with exponential backoff. |
| **User retry** | Business-level action for items already marked `FAILED`. Explicit API, optimistic concurrency via `updateMany` on `status = FAILED`. |

Simulated business failures **do not** throw from the worker—they are persisted as `FAILED` and the BullMQ job completes successfully. That keeps queue retries distinct from user retries.

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ and Redis 7+ (via Docker Compose below, or any local/hosted instances)
- npm

### 1. Install

```bash
npm install
```

### 2. Start infrastructure

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

Then set in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/async_job_queue?schema=public
REDIS_URL=redis://localhost:6379
```

**Option B — existing local Postgres + Redis 7+:**

Point `DATABASE_URL` and `REDIS_URL` in `.env` at your instances. Confirm Redis is up with:

```bash
npm run redis
```

> BullMQ requires Redis **5+** (7+ recommended). Do not use the old Windows Redis 3.x package.

### 3. Environment

```bash
cp .env.example .env
```

### 4. Migrate

```bash
npm run db:migrate
```

### 5. Run web + worker

```bash
npm run dev:all
```

Or separately:

```bash
npm run dev
npm run worker
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev:all` | Web server + worker |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run build` | Prisma generate + Next production build |
| `npm start` | Production web server (`server.ts`) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string for BullMQ + pub/sub |
| `NEXT_PUBLIC_APP_URL` | yes | Public app origin (Socket.IO client) |
| `PORT` | no | HTTP port (default `3000`) |
| `JOB_SUCCESS_RATE` | no | Simulated success probability (default `0.7`) |
| `JOB_MIN_DELAY_MS` / `JOB_MAX_DELAY_MS` | no | Simulated work delay range |

## Deployment

### Free deploy on Render (recommended)

Uses one free **Web** service, free **Postgres**, and free **Key Value** (Redis-compatible). Render Free cannot host a separate background worker, so the BullMQ consumer runs **in-process** when `RUN_WORKER_IN_WEB=true` (set automatically by `render.yaml`).

1. Push this repo to GitHub.
2. Open [Render Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance** → select the repo.
3. Apply the blueprint (`render.yaml`). Wait for the first deploy.
4. Copy the web URL (e.g. `https://queueboard-web.onrender.com`).
5. In the web service **Environment**, set `NEXT_PUBLIC_APP_URL` to that URL → **Save** → **Manual Deploy**.
6. Open the URL — submit a batch and confirm items move to Completed/Failed live.

Free web services sleep after idle; the first request after sleep can take ~30–60s.

Locally, keep using separate processes (`npm run dev:all`). Do **not** set `RUN_WORKER_IN_WEB` for day-to-day development.

### Docker / Self-Hosted Production Deploy

You can deploy the complete standalone production stack (PostgreSQL + Redis + Queueboard Web/Worker) using Docker Compose:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`
- Queueboard Web app on port `3000` (runs migrations automatically and handles worker tasks in-process)


### Paid / multi-service shape

| Component | Example hosts |
|-----------|----------------|
| Web (Next.js + Socket.IO via `server.ts`) | Railway, Render, Fly.io, any Node VM |
| Worker (`npm run worker`) | Second service (omit `RUN_WORKER_IN_WEB`) |
| PostgreSQL | Neon, Supabase, Railway, Render |
| Redis | Upstash (BullMQ-compatible), Redis Cloud, Railway |

### Hosting notes

- **Vercel serverless** is a poor fit: no durable worker process, and Socket.IO needs a long-lived Node server.
- Scale workers horizontally carefully; item claim uses `updateMany` where `status = PENDING` so only one worker processes a given item.
- Run `prisma migrate deploy` on release (included in the Render build command).

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs` | Body `{ count: number }` → create batch |
| `GET` | `/api/jobs/:id` | Job + items |
| `POST` | `/api/jobs/:id/items/:itemId/retry` | Retry a `FAILED` item |

Errors return `{ error: { code, message, details? } }` with appropriate HTTP status codes.

## Trade-offs

- **No authentication** — out of scope for the assignment; IDs are unguessable cuids but not access-controlled.
- **Simulated work** — randomized delay/failure instead of a real domain processor.
- **Custom Node server** — slightly more ops surface than `next start` alone, chosen so Socket.IO works reliably.
- **Redis pub/sub bridge** — decouples worker from Socket.IO process; events are best-effort (refresh heals gaps).
- **No Kafka / microservices** — BullMQ + one worker is enough for this problem.
- **Max 100 items per batch** — keeps demos responsive without needing pagination.

## Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Worker crashes mid-item | BullMQ retries infrastructure failures; claimed `PROCESSING` items may need operational recovery (future improvement). |
| Browser refresh | Full state reloaded from PostgreSQL; socket reconnects and resubscribes. |
| Redis blip | Enqueue/realtime may fail; durable state remains in Postgres. |
| DB write fails | Worker throws → BullMQ backoff retry; no realtime emit for that attempt. |
| Socket disconnect | UI shows disconnected; user can refresh; no silent full-list polling. |
| Create succeeds, enqueue fails | API returns 503; rows remain `PENDING` in Postgres for later recovery. |
| Double-click Retry | `updateMany` on `FAILED` makes the second call a 409 conflict. |

## Future Improvements

- Recovery job for stuck `PROCESSING` items after worker death
- Pagination for large batches
- Structured logging (pino) + metrics
- Optional auth / multi-tenant jobs
- Dedicated Socket.IO URL env for split deployments

## Project Structure

```
src/app/                 # UI + route handlers
src/components/jobs/     # Dashboard UI
src/lib/                 # db, redis, queue, socket, validation, types
src/server/repositories/ # Prisma access
src/server/services/     # Business logic + worker processor
worker/                  # Worker entrypoint
server.ts                # Next.js + Socket.IO HTTP server
prisma/                  # Schema + migrations
```
