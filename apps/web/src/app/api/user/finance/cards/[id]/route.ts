import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { count } = await prisma.card.deleteMany({ where: { id, userId: session.user.id } });

  if (count === 0) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
