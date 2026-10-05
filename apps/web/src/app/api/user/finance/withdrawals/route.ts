import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";
import { requestWithdrawal, withdrawalJson, WithdrawalError, MIN_WITHDRAWAL_TOMAN } from "@/lib/withdrawals";

// The account's withdrawal requests (GET) and a new one (POST {amountToman, sheba, accountHolder});
// the amount leaves the wallet now and the platform admin pays it by bank transfer.
export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.withdrawalRequest.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json({ minToman: MIN_WITHDRAWAL_TOMAN, items: items.map(withdrawalJson) });
}

export async function POST(req: NextRequest) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(withdrawalJson(await requestWithdrawal(session.user.id, body ?? {})), { status: 201 });
  } catch (err) {
    if (err instanceof WithdrawalError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
