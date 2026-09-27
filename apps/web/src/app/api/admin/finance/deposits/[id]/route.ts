import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const status    = body.status as "approved" | "rejected";
  const adminNote = ((body.adminNote ?? "") as string).trim();

  if (status !== "approved" && status !== "rejected")
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const deposit = await prisma.deposit.findUnique({ where: { id } });
  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });

  const prismaStatus = status === "approved" ? "APPROVED" : "REJECTED";

  if (status === "approved") {
    await prisma.$transaction([
      prisma.deposit.update({ where: { id }, data: { status: prismaStatus, adminNote } }),
      prisma.user.update({
        where: { id: deposit.userId },
        data: { walletBalance: { increment: deposit.amount } },
      }),
    ]);
  } else {
    await prisma.deposit.update({ where: { id }, data: { status: prismaStatus, adminNote } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const deposit = await prisma.deposit.findUnique({ where: { id } });
  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  if (deposit.status !== "REJECTED")
    return NextResponse.json({ error: "Only rejected deposits can be deleted." }, { status: 403 });

  await prisma.deposit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
