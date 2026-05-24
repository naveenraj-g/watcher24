// Dashboard layout — wraps all /overview, /audit, /logs, etc. pages with the
// sidebar and header.  Session is read server-side here and passed down as a
// prop so inner pages don't have to re-fetch it.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the session on the server.  The middleware already verified the cookie
  // exists, so a missing session here means an edge case — redirect to login.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const orgId =
    (session.session as { activeOrganizationId?: string })
      .activeOrganizationId ?? "";

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={session.user} orgId={orgId} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
