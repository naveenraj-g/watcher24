// AppSidebar — fixed left navigation panel.
// Uses the shadcn Sidebar component which handles both desktop fixed mode
// and mobile sheet mode via the SidebarProvider context.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Shield,
  FileText,
  GitBranch,
  BarChart2,
  Settings,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: Activity },
  { href: "/audit", label: "Audit", icon: Shield },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/traces", label: "Traces", icon: GitBranch },
  { href: "/metrics", label: "Metrics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface AppSidebarProps {
  userRole?: string | null;
}

// AppSidebar renders the full-height navigation panel.
// On desktop it is always visible; on mobile it slides in from the left (handled
// by the parent layout with a hamburger trigger in the Header).
export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sidebar-foreground">Watcher24</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Admin link — only shown to superadmins */}
      {userRole === "superadmin" && (
        <div className="border-t p-2">
          <Link
            href="/admin/overview"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-destructive transition-colors"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground">v0.1.0 · MVP</p>
      </div>
    </aside>
  );
}
