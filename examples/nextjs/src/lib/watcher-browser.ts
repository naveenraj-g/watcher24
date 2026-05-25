// watcher-browser.ts — browser-side Watcher24 client singleton.
// Used by the WatcherProvider in the root layout so all Client Components
// can call useAudit / useLog / useTrace / useMetric without prop drilling.
import { createBrowserClient } from "@watcher/browser";

export const watcherBrowserClient = createBrowserClient({
  apiKey: process.env.NEXT_PUBLIC_W24_API_KEY ?? "",
  appId: process.env.NEXT_PUBLIC_W24_APP_ID ?? "bookmarks-client",
  gatewayUrl: process.env.NEXT_PUBLIC_W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: process.env.NODE_ENV ?? "development",
});
