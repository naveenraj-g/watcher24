# Analytics Worker — Overview

## What Is This?

The Analytics Worker is the **processing layer** of the Watcher24 platform.

It consumes telemetry events from Redis Streams (published by the Go Gateway),
processes them, and bulk-inserts them into ClickHouse for storage and querying.

---

## Why Python?

Python was chosen for the worker layer because:

- **Analytics ecosystem** — pandas, polars, numpy for future aggregation
- **AI/ML integration** — anomaly detection, clustering (Phase 8)
- **Data processing** — clean transformation pipelines
- **Rapid iteration** — fast to add new processing rules

---

## Responsibility

The worker does exactly **four things** per event batch:

```
1. Consume   — Read a batch of events from Redis Streams (XREADGROUP)
2. Parse     — Deserialize stream fields back into Event domain objects
3. Process   — Validate, normalize, and transform events
4. Store     — Bulk insert into ClickHouse, then ACK the stream
```

It does **not**:

- Accept HTTP requests (that is the Gateway's job)
- Serve queries or dashboards
- Manage authentication or API keys

---

## Where It Fits

```
Go Gateway
  ↓  XADD
Redis Streams
  ↓  XREADGROUP (consumer group)
Analytics Worker     ← this service
  ↓  Bulk INSERT
ClickHouse
```

---

## Worker Types

Each worker subscribes to one Redis Stream topic and specializes in that event type:

| Worker | Stream Topic | ClickHouse Table |
|--------|-------------|-----------------|
| `AuditWorker` | `stream:audit` | `watcher.events` |
| `LogWorker` | `stream:log` | `watcher.events` |
| `TraceWorker` | `stream:trace` | `watcher.events` |
| `MetricWorker` | `stream:metric` | `watcher.events` |
| `SecurityWorker` | `stream:security` | `watcher.events` |

All workers write to the same `watcher.events` table in ClickHouse.
The `event_type` column differentiates them at query time.

---

## Consumer Groups

Redis Streams consumer groups provide:

- **At-least-once delivery** — messages are not lost if the worker crashes
- **Parallel processing** — multiple worker instances can share the same group
- **Offset tracking** — each worker tracks which messages it has processed

The ACK (XACK) is sent **only after** a successful ClickHouse insert.
If the insert fails, the message stays pending and will be retried.

---

## Further Reading

- [Architecture](./architecture.md) — clean architecture layers in detail
- [Workers](./workers.md) — how each worker type works
- [Configuration](./configuration.md) — environment variables
