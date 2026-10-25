import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planFeatureLines } from "@/lib/pricing";

// The plans a new salon or independent stylist can sign up with, and the free-trial length — what
// /signup-salon reads from the database, for the Android app's sign-up (apps/android SignUpSalon.kt).
// `features` are the display lines (planFeatureLines), so the app needn't rebuild them.
export async function GET() {
  const [plans, settings] = await Promise.all([
    prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, audience: true, monthlyPriceToman: true, maxStylists: true, smsPerMonth: true, features: true, recommended: true },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  return NextResponse.json({
    trialDays: settings?.trialDays ?? 0,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      audience: p.audience,
      monthlyPriceToman: p.monthlyPriceToman,
      recommended: p.recommended,
      features: planFeatureLines(p),
    })),
  });
}
