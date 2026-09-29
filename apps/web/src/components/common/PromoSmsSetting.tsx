"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/app/ui";

/**
 * Customer switch for promotional SMS ("time to book again" reminders). Only these texts stop;
 * login codes, appointment reminders and booking changes still arrive.
 */
export default function PromoSmsSetting() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/sms-preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { promoSmsOptOut: boolean } | null) => d && setOptedOut(d.promoSmsOptOut))
      .catch(() => {});
  }, []);

  async function change(receive: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/user/sms-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoSmsOptOut: !receive }),
      });
      if (!res.ok) throw new Error();
      setOptedOut(!receive);
      toast.success(receive ? "پیامک‌های یادآوری نوبت بعدی دوباره فعال شد" : "دیگر پیامک یادآوری نوبت بعدی برایتان ارسال نمی‌شود");
    } catch {
      toast.error("ذخیره تنظیم انجام نشد، دوباره تلاش کنید");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">پیامک «وقت نوبت بعدی»</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            چند هفته بعد از هر نوبت، سالن می‌تواند یادآوری کند که وقت نوبت بعدی است. کد ورود، یادآوری نوبت‌ها و تغییرات
            رزرو همیشه ارسال می‌شوند.
          </p>
        </div>
        {optedOut !== null && (
          <Toggle checked={!optedOut} disabled={saving} onChange={change} label="دریافت پیامک یادآوری نوبت بعدی" />
        )}
      </div>
    </div>
  );
}
