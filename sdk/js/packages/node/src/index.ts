/**
 * @watcher/node — Node.js client factory.
 * Import this package in any Node.js server, script, or worker.
 */
import { Client, type ClientOptions } from "@watcher/core";
import { NodeTransport } from "./transport.js";

export type { ClientOptions } from "@watcher/core";
export { NodeTransport } from "./transport.js";

/** Create a Watcher Client backed by the Node.js HTTP transport. */
export function createNodeClient(options: ClientOptions): Client {
  const transport = new NodeTransport(
    options.gatewayUrl ?? "http://localhost:8080",
    options.apiKey,
    options.appId,
    options.environment ?? "production",
  );
  return new Client(transport, options);
}
