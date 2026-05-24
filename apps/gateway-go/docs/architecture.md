# Gateway — Architecture

## Clean Architecture

The gateway follows Clean Architecture strictly.
The dependency rule: **outer layers depend on inner layers, never the reverse.**

```
Domain (innermost — no dependencies)
  ↑
Ports (interfaces only — no implementations)
  ↑
Use Cases (business logic — depends on ports, not adapters)
  ↑
Adapters (implementations of ports — Redis, Postgres)
  ↑
Transport (HTTP layer — depends on use cases)
  ↑
main.go (wires everything together)
```

---

## Layer Breakdown

### 1. Domain (`internal/domain/`)

Pure Go structs and value objects. **Zero external imports.**

| File | Purpose |
|------|---------|
| `event.go` | `Event` struct — the canonical telemetry event |
| `apikey.go` | `APIKey` struct — a validated API key with its org context |

These types flow through the entire application. Every layer speaks in domain terms.

---

### 2. Ports (`internal/ports/`)

Interfaces that define **what** the use cases need, without caring **how** it is done.

| File | Interface | Purpose |
|------|-----------|---------|
| `publisher.go` | `EventPublisher` | Publishes an event to a queue |
| `keyvalidator.go` | `KeyValidator` | Validates an API key and returns its org context |

Use cases depend on these interfaces. Adapters implement them.
This is what makes the system testable — you can swap Redis for an in-memory publisher in tests.

---

### 3. Use Cases (`internal/usecases/`)

Application business logic. Each use case is a single operation.

| File | Use Case | What It Does |
|------|----------|-------------|
| `ingest_event.go` | `IngestEvent` | Validates, enriches, and publishes a single event |

A use case:
- Accepts domain types as input
- Calls ports (never adapters directly)
- Returns domain types or errors
- Has **no knowledge** of HTTP, Redis, or Postgres

---

### 4. Adapters (`internal/adapters/`)

Concrete implementations of the port interfaces.

| Package | Implements | Technology |
|---------|-----------|-----------|
| `adapters/redis` | `EventPublisher` | Redis Streams via `go-redis/v9` |
| `adapters/postgres` | `KeyValidator` | IAM database via `pgx/v5` |

Each adapter:
- Implements exactly one port interface
- Handles all infrastructure-specific concerns (connection pooling, retries, etc.)
- Is injected into use cases via the port interface — use cases never import adapters

---

### 5. Transport (`internal/transport/`)

The HTTP layer. Converts HTTP requests into use case calls and use case results into HTTP responses.

| File | Purpose |
|------|---------|
| `server.go` | Creates and configures the Fiber app |
| `handlers/events.go` | Handles `POST /v1/{events,logs,traces,metrics,audit}` |
| `handlers/health.go` | Handles `GET /health` |
| `middleware/auth.go` | Extracts API key, calls KeyValidator, puts org context in request locals |
| `middleware/ratelimit.go` | Per-org rate limiting |

The transport layer:
- Parses HTTP requests into domain types
- Calls use cases
- Formats responses as JSON
- Never contains business logic

---

### 6. `main.go` (Composition Root)

The only place where all layers are wired together.

```
Load config
  ↓
Connect to Postgres (IAM database)
Connect to Redis
  ↓
Create adapters (inject connections)
  ↓
Create use cases (inject adapters via port interfaces)
  ↓
Create handlers (inject use cases)
  ↓
Create middleware (inject KeyValidator)
  ↓
Build Fiber app (register routes + middleware)
  ↓
Listen on :8080
```

---

## Dependency Graph

```
main.go
  ├── config
  ├── adapters/postgres  →  ports.KeyValidator
  ├── adapters/redis     →  ports.EventPublisher
  ├── usecases           →  ports.KeyValidator + ports.EventPublisher
  └── transport
        ├── middleware   →  ports.KeyValidator
        └── handlers     →  usecases
```

No arrow ever points inward toward domain or ports from an outer layer — except through the interface.
