"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listAdminSalons, setSalonStatus, type AdminSalon } from "@/lib/api/adminSalons";
import { formatSalonDate } from "@/lib/salonTime";
import Sep from "@/components/common/Sep";

const TABS: { label: string; value: AdminSalon["status"] | "ALL" }[] = [
  { label: "در انتظار تایید", value: "PENDING" },
  { label: "فعال", value: "ACTIVE" },
  { label: "معلق", value: "SUSPENDED" },
  { label: "همه", value: "ALL" },
];

const STATUS_LABEL: Record<AdminSalon["status"], string> = {
  PENDING: "در انتظار تایید",
  ACTIVE: "فعال",
  SUSPENDED: "معلق",
};

const STATUS_COLOR: Record<AdminSalon["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-rose-100 text-rose-700",
};

export default function AdminSalonsPage() {
  const token = useApiAccessToken();
  const [tab, setTab] = useState<AdminSalon["status"] | "ALL">("PENDING");
  const [salons, setSalons] = useState<AdminSalon[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!token) return;
    listAdminSalons(token, tab === "ALL" ? undefined : tab)
      .then(setSalons)
      .catch(() => setError("خطا در دریافت لیست سالن‌ها"));
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
      setError("خطا در تغییر وضعیت سالن");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">مدیریت سالن‌ها</h1>
        <p className="text-sm text-gray-500">سالن‌های تازه ثبت‌نام‌شده را بررسی و تایید کنید.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setSalons(null);
              setTab(t.value);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === t.value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!salons ? (
        <p className="text-sm text-gray-500">در حال بارگذاری...</p>
      ) : salons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">
          سالنی در این وضعیت وجود ندارد.
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
                      {STATUS_LABEL[salon.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {salon.city} — {salon.address}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    مالک: {salon.owner.firstName} {salon.owner.lastName}{" "}
                    <span dir="ltr">{salon.owner.phone}</span><Sep />ثبت‌نام: {formatSalonDate(salon.createdAt)}
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
                      تایید و فعال‌سازی
                    </button>
                  )}
                  {salon.status !== "SUSPENDED" && (
                    <button
                      type="button"
                      disabled={busyId === salon.id}
                      onClick={() => handleSetStatus(salon.id, "SUSPENDED")}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:hover:bg-rose-500/10"
                    >
                      تعلیق
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
