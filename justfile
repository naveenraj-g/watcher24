# Root justfile — delegates to each app's own justfile.
# Run `just --list` to see all recipes.

set dotenv-load := true

# List available recipes
default:
    @just --list

# ── Infrastructure ────────────────────────────────────────────────────────────

# Start all docker-compose services
up:
    docker compose up -d

# Stop all docker-compose services
down:
    docker compose down

# View logs for all services
logs:
    docker compose logs -f

# ── Database Migrations ───────────────────────────────────────────────────────
# Note: docker-entrypoint-initdb.d only fires on a fresh volume (first-ever start).
# Use these recipes to apply migrations against an already-running stack.

# Apply all Postgres migrations in order
migrate-pg:
    docker exec -e PGPASSWORD=watcher_secret -i watcher_postgres psql -U watcher -d watcher < infrastructure/postgres/migrations/001_init.sql
    docker exec -e PGPASSWORD=watcher_secret -i watcher_postgres psql -U watcher -d watcher < infrastructure/postgres/migrations/002_app_api_key_scope.sql

# Apply all ClickHouse migrations in order
migrate-ch:
    docker exec -i watcher_clickhouse clickhouse-client --user watcher --password watcher_secret --multiquery < infrastructure/clickhouse/migrations/001_init.sql
    docker exec -i watcher_clickhouse clickhouse-client --user watcher --password watcher_secret --multiquery < infrastructure/clickhouse/migrations/002_add_source.sql
    docker exec -i watcher_clickhouse clickhouse-client --user watcher --password watcher_secret --multiquery < infrastructure/clickhouse/migrations/003_add_service_name.sql

# Apply all migrations (Postgres + ClickHouse)
migrate:
    just migrate-pg
    just migrate-ch

# ── Gateway (Go) ──────────────────────────────────────────────────────────────

# Run the Go gateway
gateway-dev:
    just -f apps/gateway-go/justfile dev

# Build the Go gateway binary
gateway-build:
    just -f apps/gateway-go/justfile build

# Test the Go gateway
gateway-test:
    just -f apps/gateway-go/justfile test

# Lint the Go gateway
gateway-lint:
    just -f apps/gateway-go/justfile lint

# ── Analytics Worker (Python) ─────────────────────────────────────────────────

# Run the analytics worker
worker-dev:
    just -f apps/analytics-python/justfile dev

# Test the analytics worker
worker-test:
    just -f apps/analytics-python/justfile test

# Test the analytics worker with coverage
worker-test-cov:
    just -f apps/analytics-python/justfile test-cov

# ── Python SDK ────────────────────────────────────────────────────────────────

# Test the Python SDK
sdk-python-test:
    just -f sdk/python/justfile test

# Test the Python SDK with coverage
sdk-python-test-cov:
    just -f sdk/python/justfile test-cov

# ── IAM (Next.js) ─────────────────────────────────────────────────────────────

# Run the IAM app in dev mode
iam-dev:
    cd apps/iam && pnpm dev

# Build the IAM app
iam-build:
    cd apps/iam && pnpm build

# ── Console (Next.js) ────────────────────────────────────────────────────────

# Run the console in dev mode
console-dev:
    cd apps/console && pnpm dev

# Build the console
console-build:
    cd apps/console && pnpm build

# Install console dependencies
console-install:
    cd apps/console && pnpm install

# ── Realtime (Go) ────────────────────────────────────────────────────────────

# Run the realtime service
realtime-dev:
    just -f apps/realtime-go/justfile dev

# Test the realtime service
realtime-test:
    just -f apps/realtime-go/justfile test

# ── JS SDK ────────────────────────────────────────────────────────────────────

# Test all JS SDK packages
sdk-js-test:
    cd sdk/js && pnpm test

# Install JS SDK dependencies
sdk-js-install:
    cd sdk/js && pnpm install

# ── Go SDK ────────────────────────────────────────────────────────────────────

# Test the Go SDK
sdk-go-test:
    just -f sdk/go/justfile test

# Test the Go SDK with coverage
sdk-go-test-cov:
    just -f sdk/go/justfile test-cov

# Build the Go SDK
sdk-go-build:
    just -f sdk/go/justfile build

# Lint the Go SDK
sdk-go-lint:
    just -f sdk/go/justfile lint

# ── Run all tests ─────────────────────────────────────────────────────────────

# Run every test suite in the monorepo
test-all:
    just gateway-test
    just worker-test
    just realtime-test
    just sdk-python-test
    just sdk-js-test
    just sdk-go-test
