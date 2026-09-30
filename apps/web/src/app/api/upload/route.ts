import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { PRIVATE_FOLDER_ROLES, isPrivateFolder, uploadsDir } from "@/lib/privateUploads";

const MAX_SIZE = 5 * 1024 * 1024;

/**
 * The real image type, from the file's first bytes. Phones don't reliably report one (some
 * Android pickers send an empty type), and the name's extension is whatever the client says —
 * so both are ignored and the stored extension always comes from here.
 */
function sniffImage(b: Buffer): "jpg" | "png" | "gif" | "webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length >= 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("latin1"))) return "gif";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

const ALLOWED_FOLDERS = ["tickets", "deposits", "salons", "stylists", "banners", "expenses", "salon-expenses"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderParam = searchParams.get("folder") ?? "tickets";
  const folder = ALLOWED_FOLDERS.includes(folderParam) ? folderParam : "tickets";
  // Expense receipts are stored privately (lib/privateUploads.ts), each folder by one role only.
  if (isPrivateFolder(folder) && !PRIVATE_FOLDER_ROLES[folder as keyof typeof PRIVATE_FOLDER_ROLES].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(buffer);
  // HEIC/HEIF (iPhone and newer Android cameras) can't be shown by most browsers; the client
  // converts what it can decode to JPEG first, so only undecodable files reach this.
  if (!ext) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });

  const filename = `${randomUUID()}.${ext}`;
  const dir      = uploadsDir(folder);

  await mkdir(dir, { recursive: true });
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
