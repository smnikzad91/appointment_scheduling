import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorized } from "@/lib/externalTopUps";

// GET ?since=<ISO>: deposit SMS on the top-up cards that matched no top-up (wrong amount, paid late, two
// requests with the same amount). mychatbot.ir shows them to its admins, who pick the order each one pays
// (POST [id]/match). The cards are shared with nobatet's own top-ups, so some of these are nobatet customers'.

const MAX_DAYS = 7;

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const floor = Date.now() - MAX_DAYS * 86_400_000;
  const asked = Date.parse(req.nextUrl.searchParams.get("since") ?? "");
  const since = new Date(Number.isNaN(asked) ? Date.now() - 86_400_000 : Math.max(asked, floor));
  const rows = await prisma.bankSms.findMany({
    where: { status: "UNMATCHED", amountRial: { not: null }, receivedAt: { gte: since } },
    include: { adminCard: true },
    orderBy: { receivedAt: "asc" },
    take: 500,
  });
  return NextResponse.json({
    deposits: rows.map((s) => ({
      id: s.id,
      amountRial: s.amountRial!.toString(),
      receivedAt: s.receivedAt,
      note: s.note,
      card: s.adminCard ? { cardNumber: s.adminCard.cardNumber, ownerName: s.adminCard.ownerName, bankName: s.adminCard.bankName } : null,
    })),
  });
}
