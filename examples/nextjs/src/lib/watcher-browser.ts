// watcher-browser.ts — browser-side Watcher24 client singleton.
// Used by the WatcherProvider in the root layout so all Client Components
// can call useAudit / useLog / useTrace / useMetric without prop drilling.
//
// Multi-app keys: if NEXT_PUBLIC_W24_API_KEY is scoped to a specific app
// (created via Settings → Apps in the console), appId is resolved by the
// gateway automatically. The appId field is only needed for legacy org-level keys.
import { createBrowserClient } from "@watcher/browser";

export const watcherBrowserClient = createBrowserClient({
  apiKey: process.env.NEXT_PUBLIC_W24_API_KEY ?? "",
  // appId is optional when using an app-scoped key — the gateway resolves it.
  // Only set this if your key is an org-level key (no app linked in the console).
  ...(process.env.NEXT_PUBLIC_W24_APP_ID
    ? { appId: process.env.NEXT_PUBLIC_W24_APP_ID }
    : {}),
  gatewayUrl: process.env.NEXT_PUBLIC_W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: process.env.NODE_ENV ?? "development",
});
