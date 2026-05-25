// watcher.ts — browser-side Watcher24 client singleton.
// Import `watcherClient` wherever you need the raw client, or use the
// React hooks (useAudit, useLog, etc.) inside components instead.
import { createBrowserClient } from "@watcher/browser";

export const watcherClient = createBrowserClient({
  apiKey: import.meta.env.VITE_W24_API_KEY ?? "",
  // appId is optional when using an app-scoped key — the gateway resolves it.
  ...(import.meta.env.VITE_W24_APP_ID ? { appId: import.meta.env.VITE_W24_APP_ID } : {}),
  gatewayUrl: import.meta.env.VITE_W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: import.meta.env.MODE,
});
