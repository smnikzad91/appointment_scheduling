import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED  = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

const ALLOWED_FOLDERS = ["tickets", "deposits", "salons", "stylists"];

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
