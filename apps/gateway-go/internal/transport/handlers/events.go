// Package handlers — see health.go for package description.
package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/transport/middleware"
	"watcher24/gateway/internal/usecases"
)

// eventRequest is the JSON shape expected from SDKs.
// OrganizationID is intentionally absent — it is resolved from the API key,
// not trusted from the request body.
type eventRequest struct {
	ApplicationID string         `json:"application_id"`
	Environment   string         `json:"environment"`
	EventType     string         `json:"event_type"`
	Severity      string         `json:"severity"`
	Message       string         `json:"message"`
	Timestamp     *time.Time     `json:"timestamp"`
	TraceID       string         `json:"trace_id"`
	SpanID        string         `json:"span_id"`
	ParentSpanID  string         `json:"parent_span_id"`
	UserID        string         `json:"user_id"`
	SessionID     string         `json:"session_id"`
	Payload       map[string]any `json:"payload"`
}

// EventsHandler handles all telemetry ingestion endpoints.
type EventsHandler struct {
	ingestUC *usecases.IngestEventUseCase
	region   string
}

// NewEventsHandler creates the handler with the IngestEvent use case.
// region is the server's region tag (e.g. "us-east-1") added to every event.
func NewEventsHandler(ingestUC *usecases.IngestEventUseCase, region string) *EventsHandler {
	return &EventsHandler{ingestUC: ingestUC, region: region}
}

// HandleEvents handles POST /v1/events — accepts single event or batch (array).
func (h *EventsHandler) HandleEvents(c *fiber.Ctx) error {
	return h.handle(c, "")
}

// HandleLogs handles POST /v1/logs — shorthand for event_type: "log".
func (h *EventsHandler) HandleLogs(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeLog))
}

// HandleTraces handles POST /v1/traces — shorthand for event_type: "trace".
func (h *EventsHandler) HandleTraces(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeTrace))
}

// HandleMetrics handles POST /v1/metrics — shorthand for event_type: "metric".
func (h *EventsHandler) HandleMetrics(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeMetric))
}

// HandleAudit handles POST /v1/audit — shorthand for event_type: "audit".
func (h *EventsHandler) HandleAudit(c *fiber.Ctx) error {
	return h.handle(c, string(domain.EventTypeAudit))
}

// handle is the shared implementation for all event ingestion endpoints.
// forcedType overrides the event_type in the body (used by typed endpoints
// like /v1/logs). An empty string means the body's event_type is used.
func (h *EventsHandler) handle(c *fiber.Ctx, forcedType string) error {
	orgID, ok := c.Locals(middleware.LocalOrganizationID).(string)
	if !ok || orgID == "" {
		// This should never happen — auth middleware runs first.
		// If it does, it means middleware was bypassed, which is a bug.
		return respondError(c, fiber.StatusInternalServerError, "missing org context", "INTERNAL_ERROR")
	}

	// Resolve the app ID from the key (preferred) or fall back to the header
	// for backwards compatibility with SDKs that set x-app-id manually.
	appID, _ := c.Locals(middleware.LocalApplicationID).(string)

	// Detect if the body is an array (batch) or a single object.
	body := c.Body()
	if len(body) > 0 && body[0] == '[' {
		return h.handleBatch(c, orgID, appID, forcedType)
	}
	return h.handleSingle(c, orgID, appID, forcedType)
}

// handleSingle processes a single event from the request body.
func (h *EventsHandler) handleSingle(c *fiber.Ctx, orgID, appID, forcedType string) error {
	var req eventRequest
	if err := c.BodyParser(&req); err != nil {
		return respondError(c, fiber.StatusBadRequest, "invalid JSON body", "INVALID_PAYLOAD")
	}

	input := h.buildInput(req, orgID, appID, forcedType, c)
	if err := h.ingestUC.Execute(c.Context(), input); err != nil {
		return mapUseCaseError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok"})
}

// handleBatch processes an array of events from the request body.
func (h *EventsHandler) handleBatch(c *fiber.Ctx, orgID, appID, forcedType string) error {
	var reqs []eventRequest
	if err := c.BodyParser(&reqs); err != nil {
		return respondError(c, fiber.StatusBadRequest, "invalid JSON array", "INVALID_PAYLOAD")
	}

	inputs := make([]usecases.IngestInput, len(reqs))
	for i, req := range reqs {
		inputs[i] = h.buildInput(req, orgID, appID, forcedType, c)
	}

	if err := h.ingestUC.ExecuteBatch(c.Context(), usecases.IngestBatchInput{Events: inputs}); err != nil {
		return mapUseCaseError(c, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok", "count": len(reqs)})
}

// buildInput converts the HTTP request into a use case input struct.
// Enrichment metadata (IP, SDK version, region) is read from the request here
// and passed to the use case — the use case itself doesn't know about HTTP.
// appID is resolved from the API key; req.ApplicationID is used only as a
// fallback for legacy SDKs that set it manually and have no scoped key.
func (h *EventsHandler) buildInput(req eventRequest, orgID, appID, forcedType string, c *fiber.Ctx) usecases.IngestInput {
	eventType := req.EventType
	if forcedType != "" {
		eventType = forcedType
	}

	resolvedAppID := appID
	if resolvedAppID == "" {
		resolvedAppID = req.ApplicationID
	}

	return usecases.IngestInput{
		OrganizationID: orgID,
		ApplicationID:  resolvedAppID,
		Environment:    req.Environment,
		EventType:      domain.EventType(eventType),
		Severity:       domain.Severity(req.Severity),
		Message:        req.Message,
		Timestamp:      req.Timestamp,
		TraceID:        req.TraceID,
		SpanID:         req.SpanID,
		ParentSpanID:   req.ParentSpanID,
		UserID:         req.UserID,
		SessionID:      req.SessionID,
		Payload:        req.Payload,
		// Enrichment from HTTP context
		IPAddress:  c.IP(),
		SDKVersion: c.Get("X-SDK-Version"),
		Runtime:    c.Get("X-Runtime"),
		Region:     h.region,
	}
}

// mapUseCaseError translates use case errors into HTTP responses.
func mapUseCaseError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, usecases.ErrBatchTooLarge):
		return respondError(c, fiber.StatusRequestEntityTooLarge, err.Error(), "BATCH_TOO_LARGE")
	case errors.Is(err, usecases.ErrMissingMessage),
		errors.Is(err, usecases.ErrInvalidEventType),
		errors.Is(err, usecases.ErrInvalidSeverity):
		return respondError(c, fiber.StatusBadRequest, err.Error(), "INVALID_PAYLOAD")
	default:
		return respondError(c, fiber.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
	}
}

func respondError(c *fiber.Ctx, status int, message, code string) error {
	return c.Status(status).JSON(fiber.Map{
		"error": message,
		"code":  code,
	})
}
