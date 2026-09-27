import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // collect all distinct category names from posts
  const rows = await prisma.blogPost.findMany({ distinct: ["category"], select: { category: true } });
  const names = rows.map((r) => r.category);

  let inserted = 0;
  let skipped = 0;

  for (const name of names) {
    const exists = await prisma.blogCategory.findUnique({ where: { name } });
    if (exists) { skipped++; continue; }
    await prisma.blogCategory.create({ data: { name } });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
