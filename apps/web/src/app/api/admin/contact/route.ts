import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items.map((i) => ({ ...i, status: i.status.toLowerCase() })));
}
