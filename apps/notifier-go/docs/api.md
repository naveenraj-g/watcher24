# notifier-go — Internal API

All endpoints require the `X-Internal-Secret` header matching `NOTIFIER_INTERNAL_SECRET`.

---

## POST /api/internal/notify

Trigger a notification. Used by console and IAM for transactional emails.

**Request body:**
```json
{
  "org_id":   "org_abc123",
  "user_id":  "user_xyz",        // optional — omit for org-wide
  "template": "welcome_email",
  "channels": ["email", "in_app"],
  "dedup_key": "",               // optional — set for alert-triggered notifications
  "data": {
    "name":  "Naveen",
    "email": "naveen@example.com"
  }
}
```

**Response:** `202 Accepted` — delivery happens asynchronously for external channels.

**Templates:** `welcome_email`, `alert_notification`, `api_key_created`, `team_invitation`

---

## GET /api/internal/notifications

List in-app notifications for an org.

**Query params:**
- `org_id` (required)
- `limit` (optional, default 20, max 100)

**Response:**
```json
{
  "notifications": [...],
  "unread_count": 3
}
```

---

## PATCH /api/internal/notifications/:id/read

Mark a single notification as read.

**Query params:** `org_id` (required)

**Response:** `{"ok": true}`

---

## PATCH /api/internal/notifications/read-all

Mark all notifications for the org as read.

**Query params:** `org_id` (required)

**Response:** `{"ok": true}`

---

## GET /health

Public health check. Returns `{"ok": true}`.
