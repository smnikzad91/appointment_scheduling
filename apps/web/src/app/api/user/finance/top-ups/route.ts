import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";
import { createTopUp, expireStale, syncTopUp, topUpJson, topUpsAvailable, TopUpError } from "@/lib/topUps";

// Wallet top-ups (card-to-card through nodepass.ir, lib/topUps.ts). GET: recent ones + whether it's
// available; POST {amountToman}: a new one with the card and the exact rial amount to pay.

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await expireStale();
  const open = await prisma.walletTopUp.findMany({ where: { userId: session.user.id, status: "PENDING", nodepassPaymentId: { not: null } }, select: { id: true } });
  await Promise.all(open.map((t) => syncTopUp(t.id)));
  const items = await prisma.walletTopUp.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json({ available: topUpsAvailable(), items: items.map(topUpJson) });
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
