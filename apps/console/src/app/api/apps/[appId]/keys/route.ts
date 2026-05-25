// GET /api/apps/[appId]/keys — list API keys linked to a specific application.
// POST /api/apps/[appId]/keys — link an existing API key to this application.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { listAppKeys, setKeyAppId } from "@/lib/apps";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  const { appId } = await params;

  const keys = await listAppKeys(appId, orgId);
  return NextResponse.json(keys);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  const { appId } = await params;

  const body = await req.json().catch(() => null);
  const keyId: string = body?.keyId ?? "";

  if (!keyId) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }

  try {
    await setKeyAppId(keyId, appId, orgId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("access denied")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to link key" }, { status: 500 });
  }
}
