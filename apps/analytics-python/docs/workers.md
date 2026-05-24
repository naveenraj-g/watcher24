# Analytics Worker — Worker Details

## Consume Loop

Every worker runs this loop forever:

```
while True:
    messages = XREADGROUP stream:<type> consumer_group batch_size=100 block=2000ms
    if no messages:
        continue
    
    process_batch(messages)   # validate + normalize + bulk insert to ClickHouse
    XACK stream:<type> all message IDs  # only after successful insert
    
    on exception:
        log error, sleep 1s, retry (message stays pending in Redis)
```

---

## Consumer Groups

Each worker type has its own consumer group name:

| Worker | Consumer Group |
|--------|---------------|
| AuditWorker | `cg:audit` |
| LogWorker | `cg:log` |
| TraceWorker | `cg:trace` |
| MetricWorker | `cg:metric` |

Multiple instances of the same worker can share a consumer group —
Redis will distribute messages across them automatically.

---

## Batch Size

Default batch size: **100 events per read**.

This means:
- One XREADGROUP call reads up to 100 messages
- One ClickHouse bulk INSERT per batch
- One XACK per batch (only on success)

---

## Pending Message Recovery

If a worker crashes mid-batch, the messages stay in the **PEL** (Pending Entry List).
On restart, the worker claims them via `XAUTOCLAIM` before reading new messages.

This ensures **at-least-once delivery** — no events are lost on crash.

---

## ClickHouse Bulk Insert

Events are inserted using `clickhouse-connect`'s `insert` method which sends
a single HTTP request with all rows — much faster than one INSERT per event.

The payload (arbitrary JSON) is serialized to a string before insert,
matching the `String` column type in the `watcher.events` table.
