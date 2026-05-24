// Public surface of @watcher/nextjs.
export { watcherMiddleware, type WatcherMiddlewareOptions } from "./middleware.js";

// Re-export the node client factory for server components and Route Handlers.
export { createNodeClient } from "@watcher/node";
export type { ClientOptions } from "@watcher/core";
