import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteRelease, publishRelease, ReleaseError } from "@/lib/appReleases/releases";

// PATCH {notes?, versionName?, mandatory?, published?}; DELETE (unpublished only: row and file).
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "PLATFORM_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.published === true) await publishRelease(id);
    const data: { notes?: string; versionName?: string; mandatory?: boolean; published?: boolean; publishedAt?: null } = {};
    if (typeof body.notes === "string") data.notes = body.notes.slice(0, 2000);
    if (typeof body.versionName === "string" && body.versionName.trim()) data.versionName = body.versionName.trim().slice(0, 40);
    if (typeof body.mandatory === "boolean") data.mandatory = body.mandatory;
    // unpublishing the latest makes the previous published one "latest" again (versionInfo picks the highest published)
    if (body.published === false) Object.assign(data, { published: false, publishedAt: null });
    const release = Object.keys(data).length ? await prisma.appRelease.update({ where: { id }, data }) : await prisma.appRelease.findUnique({ where: { id } });
    if (!release) return NextResponse.json({ error: "نسخه پیدا نشد" }, { status: 404 });
    return NextResponse.json(release);
  } catch (err) {
    if (err instanceof ReleaseError) return NextResponse.json({ error: err.message }, { status: err.status });
    if ((err as { code?: string }).code === "P2025") return NextResponse.json({ error: "نسخه پیدا نشد" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await deleteRelease(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReleaseError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
