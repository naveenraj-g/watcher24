// GET /api/apps — list all applications for the authenticated org.
// POST /api/apps — create a new application.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { listApps, createApp } from "@/lib/apps";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  try {
    const apps = await listApps(orgId);
    return NextResponse.json(apps);
  } catch (err) {
    console.error("[/api/apps GET]", err);
    return NextResponse.json({ error: "Failed to load apps" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.session.activeOrganizationId ?? "";
  const body = await req.json().catch(() => null);
  const name: string = body?.name?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "name must produce a valid slug" }, { status: 400 });
  }

  try {
    const app = await createApp(orgId, name, slug);
    return NextResponse.json(app, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json(
        { error: `An app with slug "${slug}" already exists` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to create app" }, { status: 500 });
  }
}
