import { NextRequest, NextResponse } from "next/server";
import { createTopUp, topUpJson, TopUpError } from "@/lib/bankSms/topUps";
import { authorized, serviceUserId } from "@/lib/externalTopUps";

// POST {amountToman}: a top-up for mychatbot.ir (lib/externalTopUps.ts) — the card and exact rial
// amount its customer pays. Pending ones aren't cancelled: each is a different customer's order.

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    const topUp = await createTopUp(await serviceUserId(), Number(body?.amountToman), { keepPending: true });
    return NextResponse.json(topUpJson(topUp), { status: 201 });
  } catch (err) {
    if (err instanceof TopUpError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
