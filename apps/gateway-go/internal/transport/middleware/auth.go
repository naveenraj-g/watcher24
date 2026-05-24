// Package middleware contains Fiber middleware for the gateway transport layer.
// Middleware sits between the router and the handlers — it handles
// cross-cutting concerns like authentication and rate limiting.
package middleware

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/ports"
)

// Fiber locals keys — used to pass validated context from middleware to handlers.
// Using typed constants avoids typo bugs from raw string keys.
const (
	LocalOrganizationID = "organization_id"
	LocalAPIKeyID       = "api_key_id"
)

// Auth returns a Fiber middleware that validates the API key on every request.
//
// The key is extracted from the Authorization header ("Bearer <key>") or
// the X-API-Key header. It is then validated against the IAM database via
// the KeyValidator port. On success, organization_id and api_key_id are
// stored in Fiber's request locals for downstream handlers to use.
//
// On failure, the middleware short-circuits the request with a 401 response
// and the handler is never called.
func Auth(validator ports.KeyValidator) fiber.Handler {
	return func(c *fiber.Ctx) error {
		rawKey := extractAPIKey(c)
		if rawKey == "" {
			return respondUnauthorized(c, "missing API key", "MISSING_API_KEY")
		}

		apiKey, err := validator.Validate(c.Context(), rawKey)
		if err != nil {
			return mapKeyError(c, err)
		}

		// Store resolved context in locals so handlers can read it without
		// re-querying the database.
		c.Locals(LocalOrganizationID, apiKey.OrganizationID)
		c.Locals(LocalAPIKeyID, apiKey.ID)

		return c.Next()
	}
}

// extractAPIKey tries Authorization header first, then X-API-Key.
// Returns empty string if neither is present.
func extractAPIKey(c *fiber.Ctx) string {
	// Standard Bearer token format: "Authorization: Bearer wtch_..."
	if auth := c.Get("Authorization"); auth != "" {
		if after, ok := strings.CutPrefix(auth, "Bearer "); ok {
			return strings.TrimSpace(after)
		}
	}

	// Alternative header for SDK convenience: "X-API-Key: wtch_..."
	if key := c.Get("X-API-Key"); key != "" {
		return strings.TrimSpace(key)
	}

	return ""
}

// mapKeyError translates domain API key errors into appropriate HTTP responses.
func mapKeyError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, domain.ErrAPIKeyNotFound):
		return respondUnauthorized(c, "invalid API key", "INVALID_API_KEY")
	case errors.Is(err, domain.ErrAPIKeyDisabled):
		return respondUnauthorized(c, "API key is disabled", "INVALID_API_KEY")
	case errors.Is(err, domain.ErrAPIKeyExpired):
		return respondUnauthorized(c, "API key has expired", "INVALID_API_KEY")
	default:
		// Don't expose internal errors to the client — log server-side, return generic message
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "internal server error",
			"code":  "INTERNAL_ERROR",
		})
	}
}

func respondUnauthorized(c *fiber.Ctx, message, code string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": message,
		"code":  code,
	})
}
