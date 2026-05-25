// POST /api/apps/unlink-key — remove the app association from an API key.
// Sets apikey.app_id = NULL so the key becomes an unscoped org key again.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { setKeyAppId } from "@/lib/apps";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  const body = await req.json().catch(() => null);
  const keyId: string = body?.keyId ?? "";

  if (!keyId) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }

  await setKeyAppId(keyId, null, orgId);
  return NextResponse.json({ ok: true });
}
