# Multi-App Support

## What is an App?

An **App** is a registered instrumented target inside an organisation — a web frontend,
mobile app, backend API, background worker, AI agent, etc. Each app gets its own API
keys, and every event ingested through those keys is tagged with that app's ID.

```
Organisation
 ├── App: payments-api      → Key: wtch_abc...  (production)
 │                          → Key: wtch_abd...  (staging)
 ├── App: checkout-web      → Key: wtch_xyz...
 └── App: mobile-ios        → Key: wtch_mno...
```

## Managing Apps

Apps are managed at **Settings → Apps** in the console.

| Action | How |
|--------|-----|
| Create app | Enter a name → slug is auto-generated → click Create |
| View app ID | Shown under each app row — click to copy |
| Link a key | Click the app → select a key from the dropdown → Link |
| Unlink a key | Click the trash icon next to a linked key |
| Delete app | Click the trash icon on the app list — linked keys are unlinked, not deleted |

## App Switcher

The top nav contains an **App Switcher** dropdown. Selecting an app sets a `watcher_app`
cookie. All explorer pages (Audit, Logs, Traces, Metrics) read this cookie server-side
and add an `application_id` filter to their ClickHouse queries. Selecting **All Apps**
clears the cookie and shows events from every app.

## How `application_id` Is Resolved on Ingest

The gateway resolves `application_id` for every incoming event using this priority:

```
1. app_id column on the apikey row   (set when key is linked to an app in the console)
2. appId from the SDK config         (fallback — only used when the key has no app linked)
```

### Key linked to an app ✅

> **The key always wins. The SDK `appId` config value is completely ignored.**

When a key is linked to an app the `apikey.app_id` column is set to that app's UUID.
Every event sent with that key is tagged with the linked app's ID automatically —
regardless of what the SDK config says.

```
Key linked to: payments-api (50d1064f-...)
SDK config:    appId: "anything"
Stored as:     application_id = "50d1064f-..."   ← key wins
```

> **Recommended**: link the key to the app in the console and remove `appId` from the
> SDK config. The key carries the app identity — no manual config needed.

### Key NOT linked to any app (legacy / org-level key)

The gateway falls back to whatever `appId` the SDK sends.

**If the SDK passes the app's registered UUID** (copied from Settings → Apps):

Events are stored with the correct `application_id` and the app switcher filter works.
This is a valid transitional setup while migrating to scoped keys.

```
Key linked to: nothing
SDK config:    appId: "50d1064f-..."   ← must match a real app UUID from the console
Stored as:     application_id = "50d1064f-..."   ✅ filter works
```

**If the SDK passes a free-form string** (e.g. `"my-app"`, `"bookmarks-client"`):

> ⚠️ **Warning: events will not appear in any per-app filtered view.**
>
> The string is stored in ClickHouse as `application_id` but it has no matching row in
> the `applications` table. The app switcher filters by registered UUID — a free-form
> string will never match. Events only appear under **All Apps**.

```
Key linked to: nothing
SDK config:    appId: "bookmarks-client"   ← not a UUID, not in applications table
Stored as:     application_id = "bookmarks-client"
Console view:  ✅ shows in "All Apps"
               ❌ never shows when a specific app is selected
```

### Summary

| Key linked to app? | SDK `appId` | `application_id` stored | App filter works? |
|--------------------|-------------|------------------------|-------------------|
| ✅ Yes | anything | key's app UUID | ✅ Yes |
| ❌ No | registered app UUID | that UUID | ✅ Yes |
| ❌ No | free-form string | that string | ❌ No |
| ❌ No | not set | `""` (empty) | ❌ No |

> 💡 **Bottom line**: always link your API key to an app in the console. It is the only
> way to guarantee correct filtering regardless of what the SDK sends.

## Database

Apps are stored in the `applications` table in the IAM PostgreSQL database. The console
connects directly via `IAM_DATABASE_URL` (see `configuration.md`).

```sql
-- applications table (created by migration 001_init.sql)
CREATE TABLE applications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  organization_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

-- app_id column on apikey (added by migration 002_app_api_key_scope.sql)
ALTER TABLE apikey ADD COLUMN app_id TEXT REFERENCES applications(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` means deleting an app unlinks its keys — it does not delete them.
