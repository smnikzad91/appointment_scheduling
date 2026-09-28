"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listAdminSalons, setSalonStatus, setSalonSubscription, type AdminSalon } from "@/lib/api/adminSalons";
import { getAdminPricing } from "@/lib/api/adminPricing";
import type { PricingPlanData } from "@/lib/pricing";
import { normalizeDigits } from "@/lib/persian";
import { Modal } from "@/components/ui/modal";
import SelectField from "@/components/admin/SelectField";
import Sep from "@/components/common/Sep";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";

const TABS: { label: TranslationKey; value: AdminSalon["status"] | "ALL" }[] = [
  { label: "slPending", value: "PENDING" },
  { label: "slActive", value: "ACTIVE" },
  { label: "slSuspended", value: "SUSPENDED" },
  { label: "slAll", value: "ALL" },
];

const STATUS_LABEL: Record<AdminSalon["status"], TranslationKey> = {
  PENDING: "slPending",
  ACTIVE: "slActive",
  SUSPENDED: "slSuspended",
};

const STATUS_COLOR: Record<AdminSalon["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-rose-100 text-rose-700",
};

export default function AdminSalonsPage() {
  const token = useApiAccessToken();
  const t = useT();
  const { date } = useLocaleFormat();
  const [tab, setTab] = useState<AdminSalon["status"] | "ALL">("PENDING");
  const [salons, setSalons] = useState<AdminSalon[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlanData[]>([]);
  const [planFor, setPlanFor] = useState<AdminSalon | null>(null);

  useEffect(() => {
    getAdminPricing().then((d) => setPlans(d.plans)).catch(() => setPlans([]));
  }, []);

  function reload() {
    if (!token) return;
    listAdminSalons(token, tab === "ALL" ? undefined : tab)
      .then(setSalons)
      .catch(() => setError(t("slLoadError")));
  }

  useEffect(reload, [token, tab]);

  async function handleSetStatus(id: string, status: AdminSalon["status"]) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await setSalonStatus(token, id, status);
      reload();
    } catch {
      setError(t("slStatusError"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{t("slTitle")}</h1>
        <p className="text-sm text-gray-500">{t("slSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            type="button"
            onClick={() => {
              setSalons(null);
              setTab(tb.value);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === tb.value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!salons ? (
        <p className="text-sm text-gray-500">{t("slLoading")}</p>
      ) : salons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">
          {t("slEmpty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {salons.map((salon) => (
            <div key={salon.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{salon.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_COLOR[salon.status]}`}>
                      {t(STATUS_LABEL[salon.status])}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {salon.city} — {salon.address}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("slOwner")}: {salon.owner.firstName} {salon.owner.lastName}{" "}
                    <span dir="ltr">{salon.owner.phone}</span>
                    <Sep />
                    {t("slRegistered")}: {date(salon.createdAt)}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    {t("slPlan")}:{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{salon.plan?.name ?? t("slNoPlan")}</span>
                    {salon.plan && (
                      <>
                        <Sep />
                        {!salon.planExpiresAt ? (
                          t("slNoEnd")
                        ) : new Date(salon.planExpiresAt) <= new Date() ? (
                          <span className="font-semibold text-rose-600">{t("slExpiredOn")} {date(salon.planExpiresAt)}</span>
                        ) : (
                          <>{t("slUntil")} {date(salon.planExpiresAt)}</>
                        )}
                      </>
                    )}
                    <button type="button" onClick={() => setPlanFor(salon)} className="font-semibold text-brand-500 hover:underline">
                      {t("slChangePlan")}
                    </button>
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {salon.status !== "ACTIVE" && (
                    <button
                      type="button"
                      disabled={busyId === salon.id}
                      onClick={() => handleSetStatus(salon.id, "ACTIVE")}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {t("slApprove")}
                    </button>
                  )}
                  {salon.status !== "SUSPENDED" && (
                    <button
                      type="button"
                      disabled={busyId === salon.id}
                      onClick={() => handleSetStatus(salon.id, "SUSPENDED")}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:hover:bg-rose-500/10"
                    >
                      {t("slSuspend")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {planFor && token && (
        <PlanEditor
          token={token}
          salon={planFor}
          plans={plans}
          onClose={() => setPlanFor(null)}
          onSaved={() => {
            setPlanFor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

const DAY_MS = 86_400_000;

/**
 * Assign a plan and an end date by hand (no payment gateway yet). The end date is "N days from"
 * the current end when renewing the same plan before it runs out, otherwise from today.
 */
function PlanEditor({
  token,
  salon,
  plans,
  onClose,
  onSaved,
}: {
  token: string;
  salon: AdminSalon;
  plans: PricingPlanData[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { date, num, apiError } = useLocaleFormat();
  const [planId, setPlanId] = useState(salon.plan?.id ?? "");
  const [mode, setMode] = useState<"none" | "days">(salon.planExpiresAt ? "days" : "none");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const currentEnd = salon.planExpiresAt ? new Date(salon.planExpiresAt).getTime() : null;
  const base = planId === salon.plan?.id && currentEnd && currentEnd > now ? currentEnd : now;
  const n = Number(days);
  const validDays = Number.isInteger(n) && n >= 1 && n <= 3650;
  const expiresAt = mode === "days" && validDays ? new Date(base + n * DAY_MS).toISOString() : null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setSalonSubscription(token, salon.id, planId || null, planId ? expiresAt : null);
      onSaved();
    } catch (err) {
      setError(apiError(err, t("slStatusError")));
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5";
  return (
    <Modal isOpen onClose={onClose} className="mx-4 max-w-md">
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t("slPlanTitle")}</h3>
          <p className="mt-1 text-sm text-gray-500">{salon.name}</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("slPlan")}</span>
          <SelectField
            ariaLabel={t("slPlan")}
            value={planId}
            onChange={setPlanId}
            options={[
              { value: "", label: t("slNoPlanOption") },
              ...plans.map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (${t("prHidden")})` })),
            ]}
          />
        </label>

        {planId && (
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("slEnd")}</span>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" checked={mode === "none"} onChange={() => setMode("none")} className="accent-brand-500" />
              {t("slNoEnd")}
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" checked={mode === "days"} onChange={() => setMode("days")} className="accent-brand-500" />
              <input
                className="h-9 w-20 rounded-lg border border-gray-300 bg-transparent px-2 text-center text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
                inputMode="numeric"
                dir="ltr"
                value={days}
                onFocus={() => setMode("days")}
                onChange={(e) => setDays(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 4))}
                aria-label={t("slDays")}
              />
              {t("slDaysFrom")} {base === now ? t("slToday") : date(new Date(base).toISOString())}
            </label>
            {mode === "days" && (
              <div className="flex flex-wrap gap-2 ps-6">
                {[30, 90, 180, 365].map((d) => (
                  <button key={d} type="button" className={btn} onClick={() => setDays(String(d))}>
                    {num(d)} {t("slDays")}
                  </button>
                ))}
              </div>
            )}
            {expiresAt && <p className="ps-6 text-xs text-gray-500">{t("slUntil")} {date(expiresAt)}</p>}
          </div>
        )}

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>
            {t("prCancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || (!!planId && mode === "days" && !validDays)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? t("prSaving") : t("prSave")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
