import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const item = await prisma.announcement.findFirst({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(item ?? null);
}
