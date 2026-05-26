// Package config loads and exposes all environment-based configuration for the gateway.
// All configuration is read once at startup. The Config struct is passed down
// through the composition root (main.go) — no global variables.
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the gateway.
// Each field maps directly to an environment variable documented in
// docs/configuration.md.
type Config struct {
	// Port is the HTTP port the gateway listens on (default: "8080").
	Port string

	// Env is the deployment environment name: development, staging, production.
	Env string

	// Region is a tag added to every ingested event for routing and filtering.
	Region string

	// IAMDatabaseURL is the PostgreSQL connection string for the IAM database.
	// The gateway uses this to validate API keys (read-only queries).
	IAMDatabaseURL string

	// RedisURL is the Redis connection string for publishing events to streams.
	RedisURL string

	// ClickhouseURL is the ClickHouse HTTP endpoint used to count monthly events
	// for plan limit enforcement (e.g. "http://localhost:8123").
	ClickhouseURL      string
	ClickhouseUser     string
	ClickhousePassword string
	ClickhouseDB       string
}

// Load reads environment variables and returns a populated Config.
// Attempts to load a .env file from the project root first; if not found,
// falls back to the process environment (standard for Docker/Kubernetes).
func Load() *Config {
	// Try loading from project root .env — useful for local development.
	// Silently ignored in production where env vars come from the container runtime.
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("gateway: no .env file found, reading from environment")
	}

	return &Config{
		Port:               getEnv("GATEWAY_PORT", "8080"),
		Env:                getEnv("GATEWAY_ENV", "development"),
		Region:             getEnv("GATEWAY_REGION", "local"),
		IAMDatabaseURL:     getEnv("IAM_DATABASE_URL", "postgresql://watcher:watcher_secret@localhost:5433/iam"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		ClickhouseURL:      getEnv("CLICKHOUSE_URL", "http://localhost:8123"),
		ClickhouseUser:     getEnv("CLICKHOUSE_USER", "watcher"),
		ClickhousePassword: getEnv("CLICKHOUSE_PASSWORD", "watcher_secret"),
		ClickhouseDB:       getEnv("CLICKHOUSE_DB", "watcher"),
	}
}

// getEnv returns the value of the environment variable named by key,
// or fallback if the variable is not set or empty.
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
