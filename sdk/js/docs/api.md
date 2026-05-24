# Watcher SDK (JavaScript) — API Reference

## Client

```ts
import { createNodeClient } from "@watcher/node";   // Node.js
import { createBrowserClient } from "@watcher/browser"; // Browser

const client = createNodeClient({
  apiKey: "wtch_...",          // required
  appId: "billing-api",        // required
  environment: "production",   // default: "production"
  gatewayUrl: "http://...",    // default: "http://localhost:8080"
  flushInterval: 500,          // ms between auto-flushes (default: 500)
  flushAt: 100,                // flush when buffer hits N events (default: 100)
  maxBuffer: 10_000,           // drop oldest if buffer exceeds this (default: 10000)
});
```

---

## Methods

### `client.audit(message, options?)`

```ts
client.audit("user.login", { userId: "u_123", payload: { method: "email" } });
client.audit("api_key.created", { userId: "u_789", sessionId: "s_001" });
```

---

### `client.log(severity, message, options?)`

**severity:** `"debug"` `"info"` `"warn"` `"error"` `"critical"`

```ts
client.log("info", "Request completed", { payload: { durationMs: 45 } });
client.log("error", "Payment failed", { payload: { orderId: "o_001" } });
```

---

### `client.trace(message, options?)`

```ts
client.trace("db.query", { traceId: "abc", spanId: "s1", payload: { table: "orders" } });
client.trace("http.request", { traceId: "abc", spanId: "s2", parentSpanId: "s1" });
```

---

### `client.metric(message, options?)`

```ts
client.metric("api.latency", { payload: { value: 123, unit: "ms" } });
client.metric("queue.depth", { payload: { value: 42, queue: "emails" } });
```

---

### `client.event(eventType, severity, message, options?)`

Generic — use when typed helpers don't fit.

```ts
client.event("security", "critical", "Brute force detected", { payload: { ip: "1.2.3.4" } });
client.event("ai", "info", "Agent completed", { payload: { tokens: 1240 } });
```

---

### `client.flush()`

Immediately sends all buffered events. Returns a Promise.

```ts
await client.flush();
```

---

### `client.shutdown()`

Flushes and stops the background flusher. Call before process exit.

```ts
await client.shutdown();
```

---

## React Hooks (`@watcher/react`)

```tsx
import { WatcherProvider, useWatcher, useAudit, useLog } from "@watcher/react";

// Wrap your app
<WatcherProvider client={client}>...</WatcherProvider>

// Inside any component
const client = useWatcher();
const audit = useAudit();   // pre-bound client.audit
const log = useLog();       // pre-bound client.log

audit("user.clicked", { payload: { button: "checkout" } });
log("warn", "Cart empty at checkout");
```

---

## Next.js Middleware (`@watcher/nextjs`)

```ts
// middleware.ts (project root)
import { watcherMiddleware } from "@watcher/nextjs";

export const middleware = watcherMiddleware({
  apiKey: process.env.WATCHER_API_KEY!,
  appId: "my-nextjs-app",
});

export const config = { matcher: "/api/:path*" };
```
