import SignUpSalonForm from "@/components/auth/SignUpSalonForm";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "ثبت‌نام سالن",
  description: "سالن زیبایی خود را رایگان در نوبتت ثبت کنید و نوبت‌دهی آنلاین را همین امروز شروع کنید.",
};

// ?plan=<id> comes from a plan's button in the landing page's pricing section.
export default async function SignUpSalon({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const [{ plan }, plans, settings] = await Promise.all([
    searchParams,
    prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, monthlyPriceToman: true, maxStylists: true, smsPerMonth: true, features: true, recommended: true },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const initial = plans.find((p) => p.id === plan) ?? plans.find((p) => p.recommended) ?? plans[0] ?? null;

  return <SignUpSalonForm plans={plans} initialPlanId={initial?.id ?? null} trialDays={settings?.trialDays ?? 0} />;
}
