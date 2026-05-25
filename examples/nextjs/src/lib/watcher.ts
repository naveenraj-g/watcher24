// watcher.ts — server-side Watcher24 client singleton.
// Import this in Server Components, Route Handlers, and Server Actions.
// Never import it in Client Components — use @watcher/nextjs/client hooks there.
//
// The singleton pattern (globalThis cache) prevents creating a new client
// on every hot-reload in development, which would spin up many background flushers.
import { createNextServerClient } from "@watcher/nextjs/server";

declare global {
  // eslint-disable-next-line no-var
  var __watcher: ReturnType<typeof createNextServerClient> | undefined;
}

export const watcher =
  globalThis.__watcher ??
  (globalThis.__watcher = createNextServerClient({
    apiKey: process.env.W24_API_KEY ?? "",
    appId: process.env.W24_APP_ID ?? "bookmarks-server",
    gatewayUrl: process.env.W24_GATEWAY_URL ?? "http://localhost:8080",
    environment: process.env.NODE_ENV ?? "development",
  }));
