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
    cd iam && pnpm dev

# Build the IAM app
iam-build:
    cd iam && pnpm build

# ── Run all tests ─────────────────────────────────────────────────────────────

# Run every test suite in the monorepo
test-all:
    just gateway-test
    just worker-test
    just sdk-python-test
