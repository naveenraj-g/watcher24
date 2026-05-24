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

	// Permissions is an optional JSON-encoded list of allowed actions.
	// nil means unrestricted (all event types accepted).
	Permissions *string

	// ExpiresAt is nil for non-expiring keys.
	ExpiresAt *time.Time
}

// ErrAPIKeyNotFound is returned when no key matches the provided hash.
var ErrAPIKeyNotFound = domainError("api key not found")

// ErrAPIKeyDisabled is returned when the key exists but enabled=false.
var ErrAPIKeyDisabled = domainError("api key is disabled")

// ErrAPIKeyExpired is returned when the key's expiresAt is in the past.
var ErrAPIKeyExpired = domainError("api key has expired")

// domainError is a simple typed error for domain-level failures.
// Using a named type lets callers do errors.Is() checks without importing
// error libraries.
type domainError string

func (e domainError) Error() string { return string(e) }
