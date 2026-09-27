import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cards = await prisma.adminCard.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json(cards.map((c) => ({
    id:         c.id,
    cardNumber: c.cardNumber,
    ownerName:  c.ownerName,
    bankName:   c.bankName,
    createdAt:  c.createdAt,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body       = await req.json();
  const cardNumber = ((body.cardNumber ?? "") as string).replace(/\s/g, "");
  const ownerName  = ((body.ownerName  ?? "") as string).trim();
  const bankName   = ((body.bankName   ?? "") as string).trim();

  if (!/^\d{16}$/.test(cardNumber))
    return NextResponse.json({ error: "Card number must be exactly 16 digits." }, { status: 400 });
  if (!ownerName)
    return NextResponse.json({ error: "Owner name is required." }, { status: 400 });
  if (!bankName)
    return NextResponse.json({ error: "Bank name is required." }, { status: 400 });

  try {
    const card = await prisma.adminCard.create({ data: { cardNumber, ownerName, bankName } });
    return NextResponse.json({ id: card.id }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "This card number is already registered." }, { status: 409 });
    throw err;
  }
}
