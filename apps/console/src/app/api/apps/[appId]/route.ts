// DELETE /api/apps/[appId] — delete an application owned by the authenticated org.
// Existing API keys linked to this app have their app_id set to NULL (ON DELETE SET NULL).
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { deleteApp } from "@/lib/apps";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  const { appId } = await params;

  await deleteApp(appId, orgId);
  return new NextResponse(null, { status: 204 });
}
