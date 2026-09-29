import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED  = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

const ALLOWED_FOLDERS = ["tickets", "deposits", "salons", "stylists", "banners", "expenses"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderParam = searchParams.get("folder") ?? "tickets";
  const folder = ALLOWED_FOLDERS.includes(folderParam) ? folderParam : "tickets";

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const ext      = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${randomUUID()}.${ext}`;
  const dir      = join(process.cwd(), "public", "uploads", folder);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
}

/**
 * Releases salon/stylist photos that were replaced or removed: body `{ urls: string[] }`. Only
 * files no DB row references are deleted (see lib/uploadCleanup.ts), so this is safe to call
 * even if the save it follows didn't go through.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === "string").slice(0, 20) : [];
  if (urls.length === 0) return NextResponse.json({ error: "No urls provided" }, { status: 400 });

  const { deleteUnreferencedUploads } = await import("@/lib/uploadCleanup");
  const deleted = await deleteUnreferencedUploads(urls);
  return NextResponse.json({ deleted });
}
