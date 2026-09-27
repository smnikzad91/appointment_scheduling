"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock, ListChecks } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, listMyAppointments, type SelfStylist, type StylistAppointment } from "@/lib/api/stylistSelf";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { formatSalonDateTime, toSalonWallTime } from "@/lib/salonTime";

export default function StylistOverviewPage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [appointments, setAppointments] = useState<StylistAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMyStylistProfile(token), listMyAppointments(token)])
      .then(([p, a]) => {
        setProfile(p);
        setAppointments(a);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  if (error) return <p className="text-sm text-rose-500">{error}</p>;
  if (!profile || !appointments) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  const now = new Date();
  const upcoming = appointments
    .filter((a) => new Date(a.startAt) >= now && a.status !== "CANCELLED")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const todayKey = toSalonWallTime(now).dateKey;
  const todayCount = upcoming.filter((a) => toSalonWallTime(a.startAt).dateKey === todayKey).length;
  const pendingCount = appointments.filter((a) => a.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">سلام، {profile.displayName}</h1>
        <p className="text-sm text-gray-500">وضعیت نوبت‌های امروز و پیش‌روی شما</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="نوبت‌های امروز" value={toPersianDigits(todayCount)} />
        <StatCard icon={Clock} label="در انتظار تایید" value={toPersianDigits(pendingCount)} />
        <StatCard icon={ListChecks} label="نوبت‌های آینده" value={toPersianDigits(upcoming.length)} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <h2 className="border-b border-gray-200 px-5 py-3 font-bold text-gray-900 dark:border-gray-800 dark:text-white">
          نوبت‌های پیش‌رو
        </h2>
        {upcoming.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">نوبتی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {upcoming.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {a.customer.firstName} {a.customer.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{a.services.map((s) => s.service.name).join("، ")}</p>
                </div>
                <div className="text-end">
                  <p className="text-gray-700 dark:text-gray-300">
                    {formatSalonDateTime(a.startAt)}
                  </p>
                  <p className="text-xs text-gray-500">{formatToman(a.priceToman)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
