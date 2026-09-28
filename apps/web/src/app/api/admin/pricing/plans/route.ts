import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parsePlanInput } from "@/lib/pricingInput";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parsePlanInput(await req.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const plan = await prisma.$transaction(async (tx) => {
    // Only one plan carries the «پیشنهادی» badge.
    if (parsed.data.recommended) await tx.pricingPlan.updateMany({ data: { recommended: false } });
    const last = await tx.pricingPlan.aggregate({ _max: { sortOrder: true } });
    return tx.pricingPlan.create({ data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  });
  return NextResponse.json(plan, { status: 201 });
}
