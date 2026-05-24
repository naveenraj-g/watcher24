# Analytics Worker — Architecture

## Clean Architecture

Same dependency rule as the Go Gateway: outer layers depend on inner, never the reverse.

```
Domain (Pydantic models — no external I/O)
  ↑
Ports (Abstract base classes — interfaces only)
  ↑
Use Cases (processing logic — depends on ports only)
  ↑
Adapters (Redis consumer, ClickHouse repository)
  ↑
Workers (consume loop — the transport layer equivalent)
  ↑
main.py (composition root — wires everything together)
```

---

## Layer Breakdown

### 1. Domain (`src/domain/`)

Pydantic models and enums. No Redis, no ClickHouse, no HTTP imports.

| File | Purpose |
|------|---------|
| `event.py` | `Event` Pydantic model — canonical telemetry event |

---

### 2. Ports (`src/ports/`)

Abstract base classes defining the contracts use cases depend on.

| File | Abstract Class | Purpose |
|------|---------------|---------|
| `consumer.py` | `StreamConsumer` | Read + acknowledge batches from a queue |
| `repository.py` | `EventRepository` | Persist a batch of events to storage |

---

### 3. Use Cases (`src/usecases/`)

Business logic for processing a batch of raw stream messages into stored events.

| File | Class | What It Does |
|------|-------|-------------|
| `process_batch.py` | `ProcessBatchUseCase` | Deserialize → validate → normalize → store |

---

### 4. Adapters (`src/adapters/`)

Concrete implementations of the port interfaces.

| Package | Implements | Technology |
|---------|-----------|-----------|
| `adapters/redis_adapter` | `StreamConsumer` | Redis Streams via `redis-py` |
| `adapters/clickhouse_adapter` | `EventRepository` | ClickHouse via `clickhouse-connect` |

---

### 5. Workers (`src/workers/`)

The consume loop — equivalent to the transport layer in the gateway.
Each worker knows its stream topic and runs the process-batch use case on repeat.

| File | Worker | Stream |
|------|--------|--------|
| `base.py` | `BaseWorker` | Abstract — shared consume loop logic |
| `audit_worker.py` | `AuditWorker` | `stream:audit` |
| `log_worker.py` | `LogWorker` | `stream:log` |
| `trace_worker.py` | `TraceWorker` | `stream:trace` |
| `metric_worker.py` | `MetricWorker` | `stream:metric` |

---

### 6. `main.py` (Composition Root)

Wires all layers together and starts workers.

```
Load config
  ↓
Connect Redis + ClickHouse
  ↓
Create adapters
  ↓
Create use cases (inject adapters via port interfaces)
  ↓
Create workers (inject use cases)
  ↓
Run workers (blocking loop)
```
