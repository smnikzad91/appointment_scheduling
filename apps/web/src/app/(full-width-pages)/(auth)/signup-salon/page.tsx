import SignUpSalonForm from "@/components/auth/SignUpSalonForm";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { seoMetadata } from "@/lib/pageSeo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ type?: string }> }): Promise<Metadata> {
  const independent = (await searchParams).type === "independent";
  return seoMetadata(independent ? "signup-independent" : "signup-salon", independent ? "/signup-salon?type=independent" : "/signup-salon");
}

// ?plan=<id> comes from a plan's button in the landing page's pricing section;
// ?type=independent opens it for an independent stylist (their own business, no salon).
export default async function SignUpSalon({ searchParams }: { searchParams: Promise<{ plan?: string; type?: string }> }) {
  const [{ plan, type }, plans, settings] = await Promise.all([
    searchParams,
    prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, monthlyPriceToman: true, maxStylists: true, smsPerMonth: true, features: true, recommended: true },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const initial = plans.find((p) => p.id === plan) ?? plans.find((p) => p.recommended) ?? plans[0] ?? null;

  return (
    <SignUpSalonForm
      plans={plans}
      initialPlanId={initial?.id ?? null}
      trialDays={settings?.trialDays ?? 0}
      initialKind={type === "independent" ? "INDEPENDENT" : "SALON"}
    />
  );
}
