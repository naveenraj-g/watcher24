// DocsSidebar — left-side navigation tree for the /docs site.
// Client component so it can read the current pathname for active state.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 hidden lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-4">
        <nav className="space-y-6">
          {docsNav.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/docs"
                      ? pathname === "/docs"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
