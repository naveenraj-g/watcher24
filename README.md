# Watcher24

A multi-tenant observability and audit logging platform. Ingest telemetry from any SDK, process it through a real-time pipeline, and inspect it on a live dashboard.

---

## Architecture

```
SDK (JS / Python)
    │
    ▼
apps/gateway-go          — Telemetry ingestion API (Go, port 8080)
    │  XADD → Redis Stream
    │  PUBLISH → Redis Pub/Sub
    ▼
apps/analytics-python    — Event processing worker (Python)
    │  Writes processed events
    ▼
ClickHouse               — Telemetry data store (port 8123)

Redis Pub/Sub
    │
    ▼
apps/realtime-go         — WebSocket fan-out service (Go, port 8081)
    │
    ▼
apps/dashboard-nextjs    — Observability dashboard (Next.js, port 3001)

apps/iam                 — Identity & Access Management (Next.js + better-auth, port 5000)
PostgreSQL               — Auth + IAM data (port 5433)
```

---

## Monorepo Structure

```
watcher24/
├── apps/
│   ├── gateway-go/        — Ingestion gateway (Go)
│   ├── analytics-python/  — Event processing worker (Python)
│   ├── realtime-go/       — WebSocket real-time service (Go)
│   ├── dashboard-nextjs/  — Observability dashboard (Next.js)
│   └── iam/               — Auth & API key management (Next.js + better-auth)
├── sdk/
│   ├── js/                — JavaScript/TypeScript SDK (pnpm workspace)
│   └── python/            — Python SDK (uv)
├── infrastructure/
│   ├── clickhouse/        — ClickHouse migrations
│   ├── postgres/          — PostgreSQL migrations
│   └── redis/             — Redis config
├── docker-compose.yml     — All infrastructure services
└── justfile               — Root task runner (delegates to each app)
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Go](https://go.dev/dl/) 1.22+
- [Python](https://www.python.org/) 3.11+ with [uv](https://github.com/astral-sh/uv)
- [Node.js](https://nodejs.org/) 20+ with [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just) task runner

---

## Quick Start

### 1. Start infrastructure

```bash
just up
# Starts: PostgreSQL, ClickHouse, Redis, MinIO
```

### 2. Configure environment files

Each app has a `.env.example` — copy and fill in values:

```bash
cp apps/gateway-go/.env.example       apps/gateway-go/.env
cp apps/analytics-python/.env.example apps/analytics-python/.env
cp apps/realtime-go/.env.example      apps/realtime-go/.env
cp apps/dashboard-nextjs/.env.example apps/dashboard-nextjs/.env
cp apps/iam/.env.example              apps/iam/.env
```

> `BETTER_AUTH_SECRET` must be the **same value** in both `apps/iam/.env` and `apps/dashboard-nextjs/.env`.

### 3. Run each service

Open a terminal per service (or use your process manager of choice):

```bash
just gateway-dev    # Go gateway       → http://localhost:8080
just worker-dev     # Python worker
just realtime-dev   # Go WebSocket     → ws://localhost:8081
just dashboard-dev  # Dashboard UI     → http://localhost:3001
just iam-dev        # IAM              → http://localhost:5000
```

---

## Services at a Glance

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| Gateway | 8080 | Go | SDK telemetry ingestion, API key validation |
| Analytics Worker | — | Python | Consume Redis stream, write to ClickHouse |
| Realtime | 8081 | Go | WebSocket fan-out from Redis pub/sub |
| Dashboard | 3001 | Next.js | Live telemetry explorer UI |
| IAM | 5000 | Next.js + better-auth | Auth, users, orgs, API keys |
| PostgreSQL | 5433 | — | Auth data (shared by IAM + Dashboard) |
| ClickHouse | 8123 | — | Telemetry event storage (90-day TTL) |
| Redis | 6379 | — | Streams (event queue) + pub/sub (realtime) |
| MinIO | 9002 | — | Object storage (S3-compatible) |

---

## SDK Usage

### JavaScript / TypeScript

```bash
pnpm add @watcher/node        # Node.js backend
pnpm add @watcher/browser     # Browser
pnpm add @watcher/react       # React hooks
pnpm add @watcher/nextjs      # Next.js (server + client)
```

```ts
import { createNodeClient } from "@watcher/node";

const watcher = createNodeClient({
  apiKey: "your_api_key",
  baseUrl: "http://localhost:8080",
  appId: "my-service",
});

watcher.audit("user.login", { userId: "u_123" });
watcher.log("warn", "Disk usage above 90%");
```

### Python

```bash
uv add watcher-sdk
```

```python
from watcher_sdk import Client

client = Client(api_key="your_api_key", base_url="http://localhost:8080")
client.audit("user.login", payload={"user_id": "u_123"})
client.log("warn", "Disk usage above 90%")
```

---

## Running Tests

```bash
just test-all          # Run every test suite

just gateway-test      # Go gateway unit tests
just worker-test       # Python worker tests
just realtime-test     # Go realtime tests
just sdk-python-test   # Python SDK tests
just sdk-js-test       # JS SDK tests
```

---

## Infrastructure Commands

```bash
just up      # Start all docker-compose services
just down    # Stop all services
just logs    # Tail logs from all services
```

---

## Environment Variables

Each app is documented in its own `docs/configuration.md`:

- [`apps/gateway-go/docs/configuration.md`](apps/gateway-go/docs/configuration.md)
- [`apps/analytics-python/docs/configuration.md`](apps/analytics-python/docs/configuration.md)
- [`apps/realtime-go/docs/configuration.md`](apps/realtime-go/docs/configuration.md)
- [`apps/dashboard-nextjs/docs/configuration.md`](apps/dashboard-nextjs/docs/configuration.md)

---

## Branch Strategy

All active development happens on the `mvp` branch.

Commit message format: `feat:` · `fix:` · `refactor:` · `test:` · `docs:`
