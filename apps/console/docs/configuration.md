# Dashboard Configuration

Copy `.env.example` to `.env` and fill in values before running.

## Environment variables

| Variable                  | Required | Default                       | Description                                                             |
|---------------------------|----------|-------------------------------|-------------------------------------------------------------------------|
| `NEXT_PUBLIC_APP_URL`     | Yes      | `http://localhost:3001`       | Public URL of the dashboard — used by the better-auth client            |
| `BETTER_AUTH_URL`         | Yes      | `http://localhost:3001`       | Server-side base URL for better-auth (must match `NEXT_PUBLIC_APP_URL`) |
| `BETTER_AUTH_SECRET`      | Yes      | —                             | **Must match IAM's `BETTER_AUTH_SECRET`** — signs session tokens        |
| `DATABASE_URL`            | Yes      | —                             | PostgreSQL connection string — **must point to the same DB as IAM**     |
| `CLICKHOUSE_URL`          | Yes      | `http://localhost:8123`       | ClickHouse HTTP interface URL                                           |
| `CLICKHOUSE_USER`         | Yes      | `watcher`                     | ClickHouse username                                                     |
| `CLICKHOUSE_PASSWORD`     | Yes      | `watcher_secret`              | ClickHouse password                                                     |
| `CLICKHOUSE_DB`           | Yes      | `watcher`                     | ClickHouse database name                                                |
| `NEXT_PUBLIC_REALTIME_URL`| No       | `ws://localhost:8081`         | WebSocket URL of the realtime-go service — used by the live feed        |
| `IAM_DATABASE_URL`        | Yes      | `postgresql://...@localhost:5433/iam` | Direct PostgreSQL connection to the IAM database — used for app and API key management |

## IAM database connection

`IAM_DATABASE_URL` must point to the same PostgreSQL database the IAM service uses.
The console reads the `applications` table and the `app_id` column on `apikey` directly
via `pg` — it does not go through the IAM HTTP API for these queries.

The console never writes to better-auth managed tables (`user`, `session`, `apikey`
columns other than `app_id`). It only writes to the `applications` table and the
`app_id` column.

## Critical: shared auth secret

`BETTER_AUTH_SECRET` must be identical to the value used in the IAM service.
They share the same PostgreSQL `session` table — if the secrets differ, sessions
created by IAM will fail validation in the dashboard and vice versa.

## Ports

| Service        | Default port |
|----------------|-------------|
| Dashboard      | 3001        |
| IAM            | 5000        |
| Realtime       | 8081        |
| Gateway        | 8080        |
| PostgreSQL     | 5433        |
| ClickHouse     | 8123        |
| Redis          | 6379        |
