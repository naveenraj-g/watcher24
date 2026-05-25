// App.tsx — root component that manages the login state and page routing.
// Tracks page views on every route change using useLog.
import { useEffect, useState } from "react";
import { useLog } from "@watcher/react";
import LoginPage from "./pages/LoginPage";
import TasksPage from "./pages/TasksPage";

interface AuthState {
  userId: string;
  email: string;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const log = useLog();

  // Log a page-view event whenever the active "page" changes.
  // In a real SPA with a router this would live in a route-change listener.
  useEffect(() => {
    const page = auth ? "tasks" : "login";
    log("info", "page.view", { payload: { page } });
  }, [auth]);

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0 }}>📋 Task Tracker</h1>
        <p style={{ color: "#666", fontSize: 13 }}>
          Watcher24 React + Node.js example
        </p>
      </header>

      {auth ? (
        <TasksPage auth={auth} onLogout={() => setAuth(null)} />
      ) : (
        <LoginPage onLogin={setAuth} />
      )}
    </div>
  );
}
