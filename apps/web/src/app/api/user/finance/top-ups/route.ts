import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";
import { autoCards, createTopUp, expireStale, topUpJson, TopUpError } from "@/lib/bankSms/topUps";

// Automatic wallet top-ups (card-to-card, confirmed by the bank SMS). GET: recent ones + whether
// it's available; POST {amountToman}: a new one with the card and the exact rial amount to pay.

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await expireStale();
  const [items, cards] = await Promise.all([
    prisma.walletTopUp.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { adminCard: true } }),
    autoCards(),
  ]);
  return NextResponse.json({ available: cards.length > 0, items: items.map(topUpJson) });
}

export async function POST(req: NextRequest) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const amountToman = Number(body?.amountToman);
  try {
    const topUp = await createTopUp(session.user.id, amountToman);
    return NextResponse.json(topUpJson(topUp), { status: 201 });
  } catch (err) {
    if (err instanceof TopUpError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
