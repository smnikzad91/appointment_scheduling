"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listAdminSalons, setSalonStatus, type AdminSalon } from "@/lib/api/adminSalons";
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
    </div>
  );
}
