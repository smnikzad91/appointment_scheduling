import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReleaseError, uploadRelease } from "@/lib/appReleases/releases";

// Android releases for /admin/app-releases. GET: newest first. POST: the APK itself as the raw
// request body (not multipart — streamed straight to disk, never held in memory).

async function admin() {
  const session = await auth();
  return session?.user?.role === "PLATFORM_ADMIN" ? session.user.id : null;
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.appRelease.findMany({ orderBy: { versionCode: "desc" } });
  const uploaders = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.createdById))] } }, select: { id: true, firstName: true, lastName: true } })).map((u) => [
      u.id,
      `${u.firstName} ${u.lastName}`.trim(),
    ]),
  );
  return NextResponse.json(rows.map((r) => ({ ...r, uploader: uploaders.get(r.createdById) ?? null })));
}

export async function POST(req: NextRequest) {
  const userId = await admin();
  if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!req.body) return NextResponse.json({ error: "فایلی ارسال نشد" }, { status: 400 });
  const declared = Number(req.headers.get("content-length"));
  if (declared > 150 * 1024 * 1024) return NextResponse.json({ error: "حجم فایل بیشتر از ۱۵۰ مگابایت است" }, { status: 413 });
  try {
    const { release, signatureWarning } = await uploadRelease(req.body, userId);
    return NextResponse.json({ release, signatureWarning }, { status: 201 });
  } catch (err) {
    if (err instanceof ReleaseError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
