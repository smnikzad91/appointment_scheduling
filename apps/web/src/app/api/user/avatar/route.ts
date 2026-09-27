import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED  = ["image/jpeg", "image/png", "image/webp"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "images", "uploads", "avatars");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "فایلی انتخاب نشده است" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "فقط JPG، PNG و WebP مجاز است" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۲ مگابایت باشد" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${session.user.id}.${ext}`;
  const avatarUrl = `/images/uploads/avatars/${filename}`;

  const bytes = await file.arrayBuffer();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(bytes));

  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl } });

  return NextResponse.json({ avatar: avatarUrl });
}
