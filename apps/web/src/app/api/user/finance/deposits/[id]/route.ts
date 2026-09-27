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

  const deposit = await prisma.deposit.findFirst({ where: { id, userId: session.user.id } });

  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  if (deposit.status === "APPROVED")
    return NextResponse.json({ error: "Approved deposits cannot be deleted." }, { status: 403 });

  await prisma.deposit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
