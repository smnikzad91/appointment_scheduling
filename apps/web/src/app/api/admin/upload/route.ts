import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const subdir = join(process.cwd(), "public", "uploads", folder);
  await mkdir(subdir, { recursive: true });
  await writeFile(join(subdir, name), buffer);

  const urlPath = folder ? `/uploads/${folder}/${name}` : `/uploads/${name}`;
  return NextResponse.json({ url: urlPath });
}
