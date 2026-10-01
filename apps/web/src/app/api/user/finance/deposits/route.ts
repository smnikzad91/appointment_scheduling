import { NextRequest, NextResponse } from "next/server";
import { requestSession } from "@/lib/requestSession";
import { prisma } from "@/lib/prisma";
import type { DepositStatus } from "@/types/content";

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deposits = await prisma.deposit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { card: { select: { cardNumber: true, bankName: true } } },
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
      card: d.card ? {
        cardNumber: d.card.cardNumber ?? "",
        bankName:   d.card.bankName   ?? "",
      } : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body         = await req.json();
  const cardId       = ((body.cardId       ?? "") as string).trim();
  const amount       = Number(body.amount  ?? 0);
  const description  = ((body.description  ?? "") as string).trim();
  const receiptImage = ((body.receiptImage ?? "") as string).trim();

  if (!cardId)
    return NextResponse.json({ error: "Card is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 1000)
    return NextResponse.json({ error: "Amount must be at least 1,000 IRT." }, { status: 400 });

  const card = await prisma.card.findFirst({ where: { id: cardId, userId: session.user.id } });
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const interceptionCode = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const deposit = await prisma.deposit.create({
    data: {
      userId: session.user.id,
      cardId,
      amount,
      description,
      receiptImage,
      interceptionCode,
    },
  });

  return NextResponse.json({ id: deposit.id, interceptionCode: deposit.interceptionCode }, { status: 201 });
}
