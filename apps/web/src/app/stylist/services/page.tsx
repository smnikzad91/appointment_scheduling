"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, updateMyServiceOverride, type SelfStylist } from "@/lib/api/stylistSelf";
import { formatToman, toPersianDigits } from "@/lib/persian";

export default function StylistServicesPage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { price: string; duration: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyStylistProfile(token)
      .then(setProfile)
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  function getDraft(entry: SelfStylist["services"][number]) {
    if (drafts[entry.serviceId]) return drafts[entry.serviceId];
    return {
      price: entry.overridePriceToman != null ? String(entry.overridePriceToman) : "",
      duration: entry.overrideDurationMinutes != null ? String(entry.overrideDurationMinutes) : "",
    };
  }

  async function handleSave(entry: SelfStylist["services"][number]) {
    if (!token) return;
    const draft = getDraft(entry);
    setSavingId(entry.serviceId);
    setError(null);
    try {
      const updated = await updateMyServiceOverride(token, entry.serviceId, {
        overridePriceToman: draft.price.trim() ? Number(draft.price) : null,
        overrideDurationMinutes: draft.duration.trim() ? Number(draft.duration) : null,
      });
      setProfile((p) =>
        p ? { ...p, services: p.services.map((s) => (s.serviceId === updated.serviceId ? updated : s)) } : p,
      );
    } catch {
      setError("خطا در ذخیره تغییرات");
    } finally {
      setSavingId(null);
    }
  }

  if (!profile) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">خدمات من</h1>
      <p className="mb-6 text-sm text-gray-500">
        خدماتی که ارائه می‌دهید توسط صاحب سالن مشخص می‌شود؛ اما می‌توانید برای هرکدام قیمت و زمان اختصاصی خودتان را تنظیم
        کنید. اگر خالی بگذارید، مقدار پیش‌فرض سالن اعمال می‌شود.
      </p>

      {error && <p className="mb-4 text-sm text-rose-500">{error}</p>}

      {profile.services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">
          هنوز خدمتی برای شما ثبت نشده است.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {profile.services.map((entry) => {
            const draft = getDraft(entry);
            return (
              <div key={entry.serviceId} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="font-medium text-gray-900 dark:text-white">{entry.service.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  پیش‌فرض سالن: {formatToman(entry.service.priceToman)} · {toPersianDigits(entry.service.durationMinutes)} دقیقه
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) => setDrafts((d) => ({ ...d, [entry.serviceId]: { ...draft, price: e.target.value } }))}
                    placeholder="قیمت اختصاصی (تومان)"
                    className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    value={draft.duration}
                    onChange={(e) => setDrafts((d) => ({ ...d, [entry.serviceId]: { ...draft, duration: e.target.value } }))}
                    placeholder="زمان اختصاصی (دقیقه)"
                    className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={savingId === entry.serviceId}
                    onClick={() => handleSave(entry)}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {savingId === entry.serviceId ? "در حال ذخیره..." : "ذخیره"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
