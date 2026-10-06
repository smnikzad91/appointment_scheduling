import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/pricing";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { trialDays } = await req.json();
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > PLAN_LIMITS.maxTrialDays)
    return NextResponse.json({ error: "Trial days must be 0–365" }, { status: 400 });

  const settings = await prisma.pricingSettings.upsert({
    where: { id: "singleton" },
    create: { trialDays },
    update: { trialDays },
  });
  return NextResponse.json({ trialDays: settings.trialDays });
}
