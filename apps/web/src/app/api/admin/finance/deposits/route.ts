import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { DepositStatus } from "@/types/content";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deposits = await prisma.deposit.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      card: { select: { cardNumber: true, bankName: true } },
    },
  });

  return NextResponse.json(
    deposits.map((d) => ({
      id:               d.id,
      amount:           d.amount,
      description:      d.description,
      receiptImage:     d.receiptImage,
      status:           d.status.toLowerCase() as DepositStatus,
      adminNote:        d.adminNote,
      interceptionCode: d.interceptionCode,
      createdAt:        d.createdAt,
      user: d.user ? {
        name:  `${d.user.firstName ?? ""} ${d.user.lastName ?? ""}`.trim(),
        email: d.user.email ?? "",
      } : null,
      card: d.card ? {
        cardNumber: d.card.cardNumber ?? "",
        bankName:   d.card.bankName   ?? "",
      } : null,
    }))
  );
}
