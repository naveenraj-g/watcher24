# Dashboard API Routes

All routes require an authenticated session cookie (set by `/api/auth/*`).

## Auth routes

Handled by better-auth via the catch-all:

```
POST /api/auth/sign-in/email       — email + password login
POST /api/auth/sign-out            — sign out
GET  /api/auth/session             — get current session
GET  /api/auth/api-key/list        — list API keys for the active user
POST /api/auth/api-key/create      — create a new API key
POST /api/auth/api-key/delete      — revoke an API key
```

## Event query routes

All event routes accept the following query parameters:

| Param    | Type   | Description                             |
|----------|--------|-----------------------------------------|
| orgId    | string | Must match the session's active org     |
| limit    | number | Max rows to return (default: 50)        |
| offset   | number | Pagination offset (default: 0)          |
| search   | string | Full-text search on `message` field     |
| severity | string | Filter by severity level                |

### GET /api/events/overview

Returns aggregate stats and hourly buckets for the last 24 hours.

Response:
```json
{
  "stats": {
    "total_events": 12483,
    "error_count": 42,
    "audit_count": 1200,
    "log_count": 9800,
    "trace_count": 1200,
    "metric_count": 283,
    "unique_users": 18,
    "unique_apps": 4
  },
  "buckets": [
    { "hour": "00:00", "count": 520, "error_count": 2 }
  ]
}
```

### GET /api/events/audit

Returns paginated audit events (`event_type = 'audit'`).

### GET /api/events/logs

Returns paginated log events (`event_type = 'log'`).

### GET /api/events/traces

Returns paginated trace events (`event_type = 'trace'`).

### GET /api/events/metrics

Returns paginated metric events (`event_type = 'metric'`).

All event routes return an array of `EventRow` objects — see `src/lib/clickhouse.ts`
for the full field list.
