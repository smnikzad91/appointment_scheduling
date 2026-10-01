import { NextResponse } from "next/server";
import { requestSession } from "@/lib/requestSession";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.adminCard.findMany({ orderBy: { createdAt: "asc" } });

  return NextResponse.json(cards.map((c) => ({
    id:         c.id,
    cardNumber: c.cardNumber,
    ownerName:  c.ownerName,
    bankName:   c.bankName,
  })));
}
