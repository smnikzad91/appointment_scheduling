"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock, Users } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, listMySalonAppointments, type OwnerSalon, type OwnerAppointment } from "@/lib/api/ownerSalon";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { formatSalonDateTime, toSalonWallTime } from "@/lib/salonTime";

export default function SalonOverviewPage() {
  const token = useApiAccessToken();
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [appointments, setAppointments] = useState<OwnerAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMySalon(token), listMySalonAppointments(token)])
      .then(([s, a]) => {
        setSalon(s);
        setAppointments(a);
      })
      .catch(() => setError("خطا در دریافت اطلاعات سالن"));
  }, [token]);

  if (error) return <p className="text-sm text-rose-500">{error}</p>;
  if (!salon || !appointments) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{salon.name}</h1>
        <p className="text-sm text-gray-500">
          {salon.status === "ACTIVE" ? "فعال" : salon.status === "PENDING" ? "در انتظار تایید" : "معلق"}
          {salon.status === "ACTIVE" && (
            <>
              {" · "}
              <Link href={`/s/${salon.slug}`} target="_blank" className="text-brand-500 hover:underline">
                مشاهده صفحه عمومی
              </Link>
            </>
          )}
        </p>
      </div>

      {salon.status === "PENDING" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-400">
          سالن شما در انتظار تایید تیم پشتیبانی است. تا تایید، صفحه عمومی سالن برای مشتریان نمایش داده نمی‌شود؛ اما می‌توانید
          همین حالا خدمات، آرایشگرها و تنظیمات را آماده کنید.
        </div>
      )}
      {salon.status === "SUSPENDED" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-400">
          سالن شما توسط پشتیبانی به‌طور موقت معلق شده و برای مشتریان قابل مشاهده نیست. برای اطلاعات بیشتر با پشتیبانی تماس
          بگیرید.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="نوبت‌های امروز" value={toPersianDigits(todayCount)} />
        <StatCard icon={Clock} label="در انتظار تایید" value={toPersianDigits(pendingCount)} />
        <StatCard icon={Users} label="نوبت‌های آینده" value={toPersianDigits(upcoming.length)} />
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
                  <p className="text-xs text-gray-500">
                    {a.services.map((s) => s.service.name).join("، ")} · {a.stylist.displayName}
                  </p>
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
