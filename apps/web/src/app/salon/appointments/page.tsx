"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMySalonAppointments, updateAppointmentStatus, type OwnerAppointment } from "@/lib/api/ownerSalon";
import { formatToman } from "@/lib/persian";
import { formatSalonDateTime } from "@/lib/salonTime";

const STATUS_LABEL: Record<OwnerAppointment["status"], string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شده",
  CANCELLED: "لغو شده",
  COMPLETED: "انجام شده",
  NO_SHOW: "عدم حضور",
};

const STATUS_COLOR: Record<OwnerAppointment["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

const FILTERS: { value: OwnerAppointment["status"] | "ALL"; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "PENDING", label: "در انتظار" },
  { value: "CONFIRMED", label: "تایید شده" },
  { value: "COMPLETED", label: "انجام شده" },
  { value: "CANCELLED", label: "لغو شده" },
  { value: "NO_SHOW", label: "عدم حضور" },
];

export default function SalonAppointmentsPage() {
  const token = useApiAccessToken();
  const [appointments, setAppointments] = useState<OwnerAppointment[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL");

  function reload() {
    if (!token) return;
    listMySalonAppointments(token).then(setAppointments);
  }

  useEffect(reload, [token]);

  const filtered = useMemo(() => {
    if (!appointments) return [];
    const list = filter === "ALL" ? appointments : appointments.filter((a) => a.status === filter);
    return [...list].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [appointments, filter]);

  async function handleSetStatus(id: string, status: OwnerAppointment["status"]) {
    if (!token) return;
    await updateAppointmentStatus(token, id, status);
    reload();
  }

  if (!appointments) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">نوبت‌ها</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f.value ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-2 text-start font-medium">مشتری</th>
              <th className="px-4 py-2 text-start font-medium">خدمات</th>
              <th className="px-4 py-2 text-start font-medium">آرایشگر</th>
              <th className="px-4 py-2 text-start font-medium">زمان</th>
              <th className="px-4 py-2 text-start font-medium">مبلغ</th>
              <th className="px-4 py-2 text-start font-medium">وضعیت</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">
                  {a.customer.firstName} {a.customer.lastName}
                </td>
                <td className="px-4 py-2.5">{a.services.map((s) => s.service.name).join("، ")}</td>
                <td className="px-4 py-2.5">{a.stylist.displayName}</td>
                <td className="px-4 py-2.5">{formatSalonDateTime(a.startAt)}</td>
                <td className="px-4 py-2.5">{formatToman(a.priceToman)}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                </td>
                <td className="px-4 py-2.5">
                  {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                    <div className="flex gap-1">
                      {a.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(a.id, "CONFIRMED")}
                          className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                        >
                          تایید
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(a.id, "COMPLETED")}
                        className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                      >
                        انجام شد
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(a.id, "NO_SHOW")}
                        className="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                      >
                        عدم حضور
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(a.id, "CANCELLED")}
                        className="rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        لغو
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  نوبتی یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
