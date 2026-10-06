import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [plans, settings] = await Promise.all([
    prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { salons: true } } },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  return NextResponse.json({
    plans: plans.map(({ _count, ...p }) => ({ ...p, salonCount: _count.salons })),
    settings: settings ? { trialDays: settings.trialDays } : DEFAULT_PRICING_SETTINGS,
  });
}
