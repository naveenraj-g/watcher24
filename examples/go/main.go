// main.go — Watcher24 Go SDK example application.
//
// Demonstrates all event types (Audit, Log, Trace, Metric, Event), structured
// payloads, trace span trees, explicit Flush, and graceful Shutdown.
//
// Run:
//
//	cp .env.example .env   # fill in WATCHER_API_KEY
//	go run .
package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	watcher "github.com/watcher24/go-sdk"
)

func main() {
	// Load .env for local development.
	// In production set env vars in your container / process environment directly.
	_ = godotenv.Load()

	apiKey := os.Getenv("WATCHER_API_KEY")
	if apiKey == "" {
		log.Fatal("WATCHER_API_KEY is required — copy .env.example to .env and fill it in")
	}

	client, err := watcher.NewClient(watcher.ClientOptions{
		APIKey:      apiKey,
		AppID:       os.Getenv("WATCHER_APP_ID"),
		ServiceName: "example-go-app",
		Environment: envOrDefault("APP_ENV", "development"),
	})
	if err != nil {
		log.Fatalf("watcher: %v", err)
	}
	// Shutdown flushes remaining events before the goroutine exits.
	defer func() {
		if err := client.Shutdown(); err != nil {
			log.Printf("watcher shutdown: %v", err)
		}
	}()

	// ── Audit events ─────────────────────────────────────────────────────────
	// Use Audit for user actions and compliance-relevant operations.

	if err := client.Audit("user.login",
		watcher.WithUserID("u_abc123"),
		watcher.WithSessionID("sess_xyz789"),
		watcher.WithPayload(map[string]any{
			"method":     "email",
			"ip":         "203.0.113.42",
			"user_agent": "Go-http-client/1.1",
		}),
	); err != nil {
		log.Printf("audit: %v", err)
	}

	if err := client.Audit("document.exported",
		watcher.WithUserID("u_abc123"),
		watcher.WithPayload(map[string]any{
			"document_id": "doc_001",
			"format":      "pdf",
			"pages":       42,
		}),
	); err != nil {
		log.Printf("audit: %v", err)
	}

	// ── Log events ───────────────────────────────────────────────────────────
	// Use Log for application-level diagnostic messages.

	_ = client.Log(watcher.SeverityInfo, "server started",
		watcher.WithPayload(map[string]any{
			"port":    8080,
			"version": "1.2.3",
		}),
	)

	_ = client.Log(watcher.SeverityWarn, "cache miss rate elevated",
		watcher.WithPayload(map[string]any{
			"miss_rate_pct": 34.7,
			"cache":         "redis",
		}),
	)

	_ = client.Log(watcher.SeverityError, "payment failed",
		watcher.WithUserID("u_abc123"),
		watcher.WithPayload(map[string]any{
			"order_id": "o_001",
			"reason":   "card_declined",
			"amount":   9900, // cents
		}),
	)

	// ── Trace spans ──────────────────────────────────────────────────────────
	// Build a parent-child span tree for a single inbound request.
	// All spans share the same traceID; parentSpanID links children to parents.

	traceID := fmt.Sprintf("trace-%d", time.Now().UnixNano())
	rootSpanID := "span-handler"

	_ = client.Trace("http.request",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{
			"method":     "POST",
			"path":       "/api/orders",
			"status":     201,
			"latency_ms": 87,
		}),
	)

	// Auth check — child of the root handler span
	_ = client.Trace("auth.validate_token",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-auth"),
		watcher.WithParentSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{"latency_ms": 3}),
	)

	// Database write — also a child of root
	_ = client.Trace("db.insert",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-db"),
		watcher.WithParentSpanID(rootSpanID),
		watcher.WithPayload(map[string]any{
			"table":      "orders",
			"latency_ms": 12,
		}),
	)

	// Downstream HTTP call — child of the db span to show nesting
	_ = client.Trace("http.client.notify_warehouse",
		watcher.WithTraceID(traceID),
		watcher.WithSpanID("span-notify"),
		watcher.WithParentSpanID("span-db"),
		watcher.WithPayload(map[string]any{
			"url":        "https://warehouse.internal/notify",
			"status":     200,
			"latency_ms": 45,
		}),
	)

	// ── Metric events ────────────────────────────────────────────────────────
	// Use Metric for numeric measurements. Put values in the payload.

	_ = client.Metric("api.request_duration",
		watcher.WithPayload(map[string]any{
			"p50_ms": 45,
			"p95_ms": 120,
			"p99_ms": 340,
			"count":  1024,
		}),
	)

	_ = client.Metric("db.connection_pool",
		watcher.WithPayload(map[string]any{
			"active":   8,
			"idle":     4,
			"max":      20,
			"wait_ms":  0,
		}),
	)

	// ── Generic event ─────────────────────────────────────────────────────────
	// Use Event when a specific type doesn't have a typed helper.

	_ = client.Event(watcher.EventTypeSecurity, watcher.SeverityWarn,
		"suspicious login attempt",
		watcher.WithPayload(map[string]any{
			"ip":              "198.51.100.1",
			"failed_attempts": 5,
			"blocked":         true,
		}),
	)

	// ── Explicit flush ────────────────────────────────────────────────────────
	// In long-running services the background goroutine handles flushing.
	// In short-lived programs or serverless handlers, call Flush explicitly.
	fmt.Println("Flushing events…")
	if err := client.Flush(); err != nil {
		log.Printf("flush: %v", err)
	}
	fmt.Println("Done — all events sent to Watcher24.")
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
