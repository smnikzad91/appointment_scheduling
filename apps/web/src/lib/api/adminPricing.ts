import type { PricingPlanData, PricingSettingsData } from "@/lib/pricing";

// /admin/pricing talks to apps/web's own routes (Prisma directly, like the other CMS pages).
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/pricing${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  return data as T;
}

export type PlanDraft = Omit<PricingPlanData, "id" | "sortOrder">;

export const getAdminPricing = () =>
  call<{ plans: PricingPlanData[]; settings: PricingSettingsData }>("");

export const createPlan = (plan: PlanDraft) =>
  call<PricingPlanData>("/plans", { method: "POST", body: JSON.stringify(plan) });

export const updatePlan = (id: string, plan: PlanDraft) =>
  call<PricingPlanData>(`/plans/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(plan) });

export const deletePlan = (id: string) =>
  call<{ ok: true }>(`/plans/${encodeURIComponent(id)}`, { method: "DELETE" });

export const reorderPlans = (ids: string[]) =>
  call<{ ok: true }>("/plans/order", { method: "PUT", body: JSON.stringify({ ids }) });

export const updatePricingSettings = (settings: PricingSettingsData) =>
  call<PricingSettingsData>("/settings", { method: "PUT", body: JSON.stringify(settings) });
