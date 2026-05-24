// Route handler that exposes all better-auth endpoints under /api/auth/*.
// The [...all] catch-all forwards every auth request to the server-side auth instance.
import { auth } from "@/lib/auth-server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
