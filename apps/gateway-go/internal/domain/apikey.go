// Package domain — see event.go for package description.
package domain

import "time"

// APIKey represents a validated API key with its resolved organizational context.
// This is the result of a successful key validation — the gateway uses it to
// attach organization_id to every event that key submits.
type APIKey struct {
	// ID is the primary key in the IAM apikey table.
	ID string

	// OrganizationID is the referenceId from the IAM apikey table.
	// This is the org that owns the key and will own all events submitted with it.
	OrganizationID string

	// AppID is the application this key is scoped to, resolved from the apikey row.
	// Empty for legacy org-scoped keys that predate the multi-app feature.
	// When non-empty, the gateway uses it instead of the SDK-supplied x-app-id header.
	AppID string

	// Permissions is an optional JSON-encoded list of allowed actions.
	// nil means unrestricted (all event types accepted).
	Permissions *string

	// ExpiresAt is nil for non-expiring keys.
	ExpiresAt *time.Time

	// EventLimitPerMonth is the maximum number of events the org may ingest in
	// one calendar month, resolved from their active subscription plan.
	// -1 means unlimited (enterprise). Defaults to 100_000 (free tier).
	EventLimitPerMonth int64
}

// ErrAPIKeyNotFound is returned when no key matches the provided hash.
var ErrAPIKeyNotFound = domainError("api key not found")

// ErrAPIKeyDisabled is returned when the key exists but enabled=false.
var ErrAPIKeyDisabled = domainError("api key is disabled")

// ErrAPIKeyExpired is returned when the key's expiresAt is in the past.
var ErrAPIKeyExpired = domainError("api key has expired")

// ErrEventLimitExceeded is returned when the org has consumed their monthly event quota.
var ErrEventLimitExceeded = domainError("monthly event limit exceeded")

// domainError is a simple typed error for domain-level failures.
// Using a named type lets callers do errors.Is() checks without importing
// error libraries.
type domainError string

func (e domainError) Error() string { return string(e) }
