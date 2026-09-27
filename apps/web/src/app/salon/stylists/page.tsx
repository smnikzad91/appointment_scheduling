"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  listMyStylists,
  inviteStylist,
  updateStylist,
  setStylistServices,
  listMyServices,
  type OwnerStylist,
  type OwnerService,
  type StylistServiceEntry,
} from "@/lib/api/ownerSalon";
import { normalizeDigits, formatToman, toPersianDigits } from "@/lib/persian";
import { SalonApiError } from "@/lib/api/salonApiClient";
import { uploadImage } from "@/lib/uploadImage";

export default function SalonStylistsPage() {
  const token = useApiAccessToken();
  const [stylists, setStylists] = useState<OwnerStylist[] | null>(null);
  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, { price: string; duration: string }>>({});
  const [savingOverrideKey, setSavingOverrideKey] = useState<string | null>(null);

  const [form, setForm] = useState({ phone: "", firstName: "", lastName: "", displayName: "" });
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    if (!token) return;
    Promise.all([listMyStylists(token), listMyServices(token)]).then(([s, sv]) => {
      setStylists(s);
      setServices(sv);
    });
  }

  useEffect(reload, [token]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setCreatedPassword(null);
    try {
      const created = await inviteStylist(token, {
        phone: normalizeDigits(form.phone),
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: form.displayName || form.firstName,
      });
      if (created.tempPassword) setCreatedPassword(created.tempPassword);
      setForm({ phone: "", firstName: "", lastName: "", displayName: "" });
      reload();
    } catch (err) {
      setError(err instanceof SalonApiError ? err.message : "خطا در افزودن آرایشگر");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarChange(stylist: OwnerStylist, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploadingAvatarId(stylist.id);
    try {
      const url = await uploadImage(file, "stylists");
      await updateStylist(token, stylist.id, { avatarUrl: url });
      reload();
    } catch {
      setError("خطا در آپلود تصویر");
    } finally {
      setUploadingAvatarId(null);
    }
  }

  async function handleToggleActive(stylist: OwnerStylist) {
    if (!token) return;
    await updateStylist(token, stylist.id, { active: !stylist.active });
    reload();
  }

  async function handleToggleService(stylist: OwnerStylist, serviceId: string) {
    if (!token) return;
    const exists = stylist.services.some((s) => s.serviceId === serviceId);
    const next: StylistServiceEntry[] = exists
      ? stylist.services.filter((s) => s.serviceId !== serviceId)
      : [...stylist.services, { serviceId, overridePriceToman: null, overrideDurationMinutes: null }];
    await setStylistServices(token, stylist.id, next);
    reload();
  }

  function draftKey(stylistId: string, serviceId: string) {
    return `${stylistId}:${serviceId}`;
  }

  function getOverrideDraft(stylist: OwnerStylist, serviceId: string) {
    const key = draftKey(stylist.id, serviceId);
    if (overrideDrafts[key]) return overrideDrafts[key];
    const existing = stylist.services.find((s) => s.serviceId === serviceId);
    return {
      price: existing?.overridePriceToman != null ? String(existing.overridePriceToman) : "",
      duration: existing?.overrideDurationMinutes != null ? String(existing.overrideDurationMinutes) : "",
    };
  }

  async function handleSaveOverride(stylist: OwnerStylist, serviceId: string) {
    if (!token) return;
    const key = draftKey(stylist.id, serviceId);
    const draft = getOverrideDraft(stylist, serviceId);
    setSavingOverrideKey(key);
    try {
      const next: StylistServiceEntry[] = stylist.services.map((s) =>
        s.serviceId === serviceId
          ? {
              serviceId,
              overridePriceToman: draft.price.trim() ? Number(draft.price) : null,
              overrideDurationMinutes: draft.duration.trim() ? Number(draft.duration) : null,
            }
          : s,
      );
      await setStylistServices(token, stylist.id, next);
      reload();
    } catch {
      setError("خطا در ذخیره قیمت اختصاصی");
    } finally {
      setSavingOverrideKey(null);
    }
  }

  if (!stylists || !services) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">آرایشگرها</h1>
        <p className="text-sm text-gray-500">آرایشگرهای سالن را دعوت کنید و خدمات هرکدام را مشخص کنید.</p>
      </div>

      <div className="flex flex-col gap-2">
        {stylists.map((stylist) => {
          const isExpanded = expandedId === stylist.id;
          return (
            <div key={stylist.id} className="rounded-xl border border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : stylist.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-start"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-bold text-gray-400 dark:bg-gray-800">
                    {stylist.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stylist.avatarUrl} alt={stylist.displayName} className="h-full w-full object-cover" />
                    ) : (
                      stylist.displayName.trim().slice(0, 1)
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{stylist.displayName}</p>
                    <p dir="ltr" className="text-end text-xs text-gray-500">
                      {stylist.user.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(stylist);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      stylist.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {stylist.active ? "فعال" : "غیرفعال"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                  <label className="mb-4 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300">
                    {uploadingAvatarId === stylist.id ? "در حال آپلود..." : "تغییر تصویر آرایشگر"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAvatarId === stylist.id}
                      onChange={(e) => handleAvatarChange(stylist, e)}
                    />
                  </label>

                  <p className="mb-2 text-xs font-medium text-gray-500">خدماتی که ارائه می‌دهد:</p>
                  <div className="flex flex-col gap-2">
                    {services.map((service) => {
                      const assigned = stylist.services.find((s) => s.serviceId === service.id);
                      const active = !!assigned;
                      const key = draftKey(stylist.id, service.id);
                      const draft = getOverrideDraft(stylist, service.id);
                      return (
                        <div key={service.id} className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleService(stylist, service.id)}
                            className={`w-fit rounded-full px-3 py-1 text-xs ${
                              active
                                ? "bg-brand-500 text-white"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {service.name}
                          </button>

                          {active && (
                            <div className="flex flex-wrap items-center gap-2 ps-1 text-xs text-gray-500">
                              <span>پیش‌فرض: {formatToman(service.priceToman)} · {toPersianDigits(service.durationMinutes)} دقیقه</span>
                              <input
                                type="number"
                                value={draft.price}
                                onChange={(e) =>
                                  setOverrideDrafts((d) => ({ ...d, [key]: { ...draft, price: e.target.value } }))
                                }
                                placeholder="قیمت اختصاصی"
                                className="w-28 rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                              <input
                                type="number"
                                value={draft.duration}
                                onChange={(e) =>
                                  setOverrideDrafts((d) => ({ ...d, [key]: { ...draft, duration: e.target.value } }))
                                }
                                placeholder="زمان اختصاصی (دقیقه)"
                                className="w-32 rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                              <button
                                type="button"
                                disabled={savingOverrideKey === key}
                                onClick={() => handleSaveOverride(stylist, service.id)}
                                className="rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {savingOverrideKey === key ? "..." : "ذخیره"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {services.length === 0 && <p className="text-xs text-gray-400">ابتدا در صفحه خدمات، خدمتی ثبت کنید.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {stylists.length === 0 && <p className="text-sm text-gray-500">هنوز آرایشگری اضافه نشده است.</p>}
      </div>

      <section className="max-w-lg rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">دعوت آرایشگر جدید</h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="نام"
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="نام خانوادگی"
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="نام نمایشی (اختیاری)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: normalizeDigits(e.target.value) }))}
            placeholder="09121234567"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-end text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />

          {error && <p className="text-sm text-rose-500">{error}</p>}
          {createdPassword && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              حساب جدید ساخته شد. آرایشگر با همین شماره موبایل و این رمز عبور موقت از صفحه ورود وارد پنل می‌شود:{" "}
              <span dir="ltr" className="font-mono font-bold">
                {createdPassword}
              </span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "در حال افزودن..." : "افزودن آرایشگر"}
          </button>
        </form>
      </section>
    </div>
  );
}
