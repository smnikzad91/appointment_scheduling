import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { count } = await prisma.adminCard.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
