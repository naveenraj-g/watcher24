// Package postgres implements the KeyValidator port using pgx/v5.
// This is a read-only adapter — it only queries the IAM database.
// The query and hashing logic mirrors the gateway exactly so API keys
// are accepted consistently across both services.
package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"watcher24/realtime/internal/ports"
)

// KeyValidatorAdapter implements ports.KeyValidator against the IAM PostgreSQL database.
type KeyValidatorAdapter struct {
	pool *pgxpool.Pool
}

// NewKeyValidatorAdapter creates the connection pool and verifies connectivity.
func NewKeyValidatorAdapter(ctx context.Context, dsn string) (*KeyValidatorAdapter, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres key validator: connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres key validator: ping: %w", err)
	}
	return &KeyValidatorAdapter{pool: pool}, nil
}

// Ping checks the database connection is alive. Used by the health handler.
func (a *KeyValidatorAdapter) Ping(ctx context.Context) error {
	return a.pool.Ping(ctx)
}

// Close releases all pool connections.
func (a *KeyValidatorAdapter) Close() {
	a.pool.Close()
}

// Validate hashes the raw key with SHA-256 and queries the IAM `apikey` table.
// Returns typed errors for not-found, disabled, and expired states so callers
// can return appropriate HTTP responses without leaking internal details.
func (a *KeyValidatorAdapter) Validate(ctx context.Context, rawKey string) (*ports.APIKey, error) {
	hash := hashKey(rawKey)

	var (
		id             string
		referenceID    string
		enabled        bool
		expiresAt      *time.Time
	)

	err := a.pool.QueryRow(ctx,
		`SELECT id, "referenceId", enabled, "expiresAt" FROM apikey WHERE key = $1`,
		hash,
	).Scan(&id, &referenceID, &enabled, &expiresAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ports.ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("postgres key validator: query: %w", err)
	}

	if !enabled {
		return nil, ports.ErrAPIKeyDisabled
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return nil, ports.ErrAPIKeyExpired
	}

	return &ports.APIKey{
		ID:             id,
		OrganizationID: referenceID,
	}, nil
}

// hashKey produces the SHA-256 hex digest that better-auth stores in IAM.
func hashKey(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
