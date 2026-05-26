// watcher.ts — server-side Watcher24 client singleton.
// Import this in Server Components, Route Handlers, and Server Actions.
// Never import it in Client Components — use @watcher/nextjs/client hooks there.
//
// The singleton pattern (globalThis cache) prevents creating a new client
// on every hot-reload in development, which would spin up many background flushers.
//
// Multi-app keys: if W24_API_KEY is scoped to a specific app (created via
// Settings → Apps in the console), appId is resolved automatically by the
// gateway and does not need to be set here. The appId field below is only
// needed for legacy org-scoped keys that predate the multi-app feature.
import { createNextServerClient } from "@watcher/nextjs/server";

declare global {
  // eslint-disable-next-line no-var
  var __watcher: ReturnType<typeof createNextServerClient> | undefined;
}

export const watcher =
  globalThis.__watcher ??
  (globalThis.__watcher = createNextServerClient({
    apiKey: process.env.W24_API_KEY ?? "",
    // appId is optional when using an app-scoped key — the gateway resolves it.
    // Only set this if your key is an org-level key (no app linked in the console).
    ...(process.env.W24_APP_ID ? { appId: process.env.W24_APP_ID } : {}),
    // serviceName labels this component in the dashboard so you can filter by service.
    // Change this to reflect what this Next.js instance is (e.g. "marketing-site", "dashboard-api").
    serviceName: "nextjs-example",
    // gatewayUrl defaults to https://ingest.watcher24.io — only override for
    // local dev (http://localhost:8080) or self-hosted deployments.
    gatewayUrl: process.env.W24_GATEWAY_URL,
    environment: process.env.NODE_ENV ?? "development",
  }));
