// Package postgres implements the KeyValidator port using the IAM PostgreSQL database.
//
// The IAM service (better-auth) stores API keys hashed with SHA-256 in the
// `apikey` table of the `iam` database. This adapter connects to that same
// database (read-only queries only) to validate incoming SDK requests.
//
// The gateway never writes to the IAM database — it only reads the apikey table.
package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"watcher24/gateway/internal/domain"
)

// KeyValidatorAdapter implements ports.KeyValidator using pgx to query
// the IAM database's apikey table.
type KeyValidatorAdapter struct {
	// pool is a pgx connection pool to the IAM database.
	// Using a pool (not a single connection) ensures concurrent requests
	// don't block each other waiting for a database connection.
	pool *pgxpool.Pool
}

// NewKeyValidatorAdapter creates the adapter and verifies the DB connection
// is reachable. Returns an error if the pool cannot be established.
func NewKeyValidatorAdapter(ctx context.Context, databaseURL string) (*KeyValidatorAdapter, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("postgres key validator: create pool: %w", err)
	}

	// Fail fast at startup — don't wait for the first request to discover
	// the database is unreachable.
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres key validator: ping: %w", err)
	}

	return &KeyValidatorAdapter{pool: pool}, nil
}

// Ping checks the database connection is still alive.
// Used by the health check handler.
func (a *KeyValidatorAdapter) Ping(ctx context.Context) error {
	return a.pool.Ping(ctx)
}

// Close releases all connections in the pool.
// Should be called on graceful shutdown.
func (a *KeyValidatorAdapter) Close() {
	a.pool.Close()
}

// Validate implements ports.KeyValidator.
//
// It hashes the raw key with SHA-256, queries the IAM apikey table, and
// returns the resolved APIKey domain object. The hashing matches exactly
// how better-auth stores keys — so only keys issued by the IAM will match.
func (a *KeyValidatorAdapter) Validate(ctx context.Context, rawKey string) (*domain.APIKey, error) {
	// Hash the raw key to match the stored value in the IAM database.
	// better-auth uses SHA-256 (hex-encoded) for all API key storage.
	hash := hashKey(rawKey)

	// iamAPIKey mirrors the relevant columns from better-auth's apikey table.
	// We only select what the gateway needs — not the full row.
	var (
		id          string
		referenceID string
		enabled     bool
		expiresAt   *time.Time
		permissions *string
	)

	err := a.pool.QueryRow(ctx,
		`SELECT id, "referenceId", enabled, "expiresAt", permissions
		 FROM apikey
		 WHERE key = $1
		 LIMIT 1`,
		hash,
	).Scan(&id, &referenceID, &enabled, &expiresAt, &permissions)

	if err != nil {
		// pgx.ErrNoRows means no key matched the hash — invalid key.
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("postgres key validator: query: %w", err)
	}

	// The key exists — now check its state.
	if !enabled {
		return nil, domain.ErrAPIKeyDisabled
	}

	if expiresAt != nil && time.Now().UTC().After(*expiresAt) {
		return nil, domain.ErrAPIKeyExpired
	}

	return &domain.APIKey{
		ID:             id,
		OrganizationID: referenceID,
		Permissions:    permissions,
		ExpiresAt:      expiresAt,
	}, nil
}

// hashKey returns the SHA-256 hex digest of the raw API key.
// This must match exactly how better-auth hashes keys on creation.
func hashKey(rawKey string) string {
	sum := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(sum[:])
}
