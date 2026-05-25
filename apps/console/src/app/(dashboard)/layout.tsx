// Dashboard layout — wraps all /overview, /audit, /logs, etc. pages.
// Session is read server-side once here so inner pages don't re-fetch.
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // New users without an active organisation go through the onboarding wizard.
  if (!session.session.activeOrganizationId) {
    redirect("/onboarding/create-org");
  }

  const orgId = session.session.activeOrganizationId;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar userRole={session.user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={session.user} orgId={orgId} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
