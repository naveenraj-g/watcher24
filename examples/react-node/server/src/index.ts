// Express server for the react-node example.
// Demonstrates @watcher/node usage: request tracing, audit events,
// log events for errors, and metric events for domain counters.
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createNodeClient } from "@watcher/node";

// ── Watcher24 client ──────────────────────────────────────────────────────────
// Create one client per process. The background flusher batches events and
// sends them every 500ms — no need to await individual calls.
const watcher = createNodeClient({
  apiKey: process.env.W24_API_KEY ?? "",
  appId: process.env.W24_APP_ID ?? "task-tracker-server",
  gatewayUrl: process.env.W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: process.env.NODE_ENV ?? "development",
});

// ── In-memory store (replace with a real DB in production) ───────────────────
interface Task {
  id: string;
  title: string;
  done: boolean;
  userId: string;
  createdAt: string;
}

const tasks = new Map<string, Task>();
let nextId = 1;

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── Request tracing middleware ───────────────────────────────────────────────
// Every request gets a trace event with method, path, status, and duration.
// The trace ID is either forwarded from the client or generated fresh here.
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers["x-trace-id"] as string) ?? crypto.randomUUID();
  const spanId = crypto.randomUUID();
  const start = Date.now();

  // Attach to request so route handlers can add child spans.
  (req as any).traceId = traceId;
  (req as any).spanId = spanId;

  res.on("finish", () => {
    watcher.trace("http.request", {
      traceId,
      spanId,
      payload: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        userAgent: req.headers["user-agent"] ?? "",
      },
    });
  });

  next();
});

// ── Auth routes ──────────────────────────────────────────────────────────────

// POST /api/auth/login — simulated login; issues a fake userId token.
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    watcher.log("warn", "login.attempt.invalid", {
      payload: { reason: "missing credentials" },
    });
    return res.status(400).json({ error: "email and password are required" });
  }

  // Fake auth — any non-empty credentials succeed.
  const userId = `user_${Buffer.from(email).toString("base64url").slice(0, 8)}`;

  // Audit every login — creates a compliance trail.
  watcher.audit("user.login", {
    userId,
    traceId: (req as any).traceId,
    payload: { email, ip: req.ip ?? "unknown" },
  });

  watcher.log("info", "auth.login.success", {
    traceId: (req as any).traceId,
    payload: { userId },
  });

  res.json({ userId, email });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const { userId } = req.body as { userId: string };

  watcher.audit("user.logout", {
    userId,
    traceId: (req as any).traceId,
    payload: { ip: req.ip ?? "unknown" },
  });

  res.json({ ok: true });
});

// ── Task routes ───────────────────────────────────────────────────────────────

// GET /api/tasks — list tasks for a user.
app.get("/api/tasks", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const userTasks = [...tasks.values()].filter((t) => t.userId === userId);

  // Track how many tasks the user has — useful for capacity planning.
  watcher.metric("tasks.list.count", {
    payload: { value: userTasks.length, userId },
  });

  res.json(userTasks);
});

// POST /api/tasks — create a task.
app.post("/api/tasks", (req: Request, res: Response) => {
  const { title, userId } = req.body as { title: string; userId: string };

  if (!title || !userId) {
    return res.status(400).json({ error: "title and userId are required" });
  }

  const task: Task = {
    id: String(nextId++),
    title,
    done: false,
    userId,
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);

  // Audit the creation — who created what and when.
  watcher.audit("task.created", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: task.id, title },
  });

  // Metric: total tasks across all users.
  watcher.metric("tasks.total", {
    payload: { value: tasks.size },
  });

  res.status(201).json(task);
});

// PATCH /api/tasks/:id — toggle done.
app.patch("/api/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });

  const { userId } = req.body as { userId: string };
  task.done = !task.done;

  watcher.audit("task.toggled", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: task.id, done: task.done },
  });

  res.json(task);
});

// DELETE /api/tasks/:id — delete a task.
app.delete("/api/tasks/:id", (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });

  const { userId } = req.query as { userId: string };
  tasks.delete(req.params.id);

  // Audit deletions so they appear in the compliance trail.
  watcher.audit("task.deleted", {
    userId,
    traceId: (req as any).traceId,
    payload: { taskId: req.params.id, title: task.title },
  });

  watcher.metric("tasks.total", {
    payload: { value: tasks.size },
  });

  res.json({ ok: true });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Catches anything thrown in route handlers and logs it before responding.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  watcher.log("error", "unhandled.server.error", {
    payload: {
      message: err.message,
      stack: err.stack ?? "",
    },
  });
  res.status(500).json({ error: "internal server error" });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  watcher.log("info", "server.started", { payload: { port: PORT } });
});

// Flush all buffered events before the process exits so nothing is lost.
process.on("SIGTERM", async () => {
  watcher.log("info", "server.shutting_down", {});
  server.close();
  await watcher.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  server.close();
  await watcher.shutdown();
  process.exit(0);
});
