"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Scissors } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, updateMyServiceOverride, type SelfStylist } from "@/lib/api/stylistSelf";
import { formatToman, normalizeDigits, toPersianDigits } from "@/lib/persian";
import { Card, EmptyState, ErrorBanner, ListSkeleton, PageHeader, TextInput, cx, riseStyle } from "@/components/app/ui";
import Sep from "@/components/common/Sep";

type Entry = SelfStylist["services"][number];

export default function StylistServicesPage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { price: string; duration: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    getMyStylistProfile(token)
      .then((p) => {
        setError(null);
        setProfile(p);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  useEffect(load, [load]);

  function draftFor(entry: Entry) {
    return (
      drafts[entry.serviceId] ?? {
        price: entry.overridePriceToman != null ? String(entry.overridePriceToman) : "",
        duration: entry.overrideDurationMinutes != null ? String(entry.overrideDurationMinutes) : "",
      }
    );
  }

  function isDirty(entry: Entry) {
    const draft = drafts[entry.serviceId];
    if (!draft) return false;
    return (
      draft.price !== (entry.overridePriceToman != null ? String(entry.overridePriceToman) : "") ||
      draft.duration !== (entry.overrideDurationMinutes != null ? String(entry.overrideDurationMinutes) : "")
    );
  }

  async function handleSave(entry: Entry) {
    if (!token) return;
    const draft = draftFor(entry);
    setSavingId(entry.serviceId);
    setError(null);
    try {
      const updated = await updateMyServiceOverride(token, entry.serviceId, {
        overridePriceToman: draft.price.trim() ? Number(draft.price) : null,
        overrideDurationMinutes: draft.duration.trim() ? Number(draft.duration) : null,
      });
      setProfile((p) => (p ? { ...p, services: p.services.map((s) => (s.serviceId === updated.serviceId ? updated : s)) } : p));
      setDrafts((d) => {
        const next = { ...d };
        delete next[entry.serviceId];
        return next;
      });
      setSavedId(entry.serviceId);
      setTimeout(() => setSavedId((id) => (id === entry.serviceId ? null : id)), 2000);
    } catch {
      setError("ذخیره تغییرات انجام نشد");
    } finally {
      setSavingId(null);
    }
  }

  if (!profile) return error ? <ErrorBanner onRetry={load}>{error}</ErrorBanner> : <ListSkeleton />;

  return (
    <>
      <PageHeader title="خدمات من" subtitle="قیمت یا زمان هر خدمت را برای خودتان تنظیم کنید؛ خالی یعنی پیش‌فرض سالن." />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {profile.services.length === 0 ? (
        <EmptyState icon={Scissors} title="هنوز خدمتی به شما داده نشده" hint="خدماتی که ارائه می‌دهید را صاحب سالن مشخص می‌کند." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {profile.services.map((entry, i) => {
            const draft = draftFor(entry);
            const dirty = isDirty(entry);
            const effectivePrice = entry.overridePriceToman ?? entry.service.priceToman;
            const effectiveDuration = entry.overrideDurationMinutes ?? entry.service.durationMinutes;
            const customized = entry.overridePriceToman != null || entry.overrideDurationMinutes != null;
            return (
              <Card key={entry.serviceId} className="app-rise p-4" style={riseStyle(i)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-app-ink">{entry.service.name}</p>
                    <p className="mt-0.5 text-[13px] text-app-muted">
                      {formatToman(effectivePrice)}<Sep />{toPersianDigits(effectiveDuration)} دقیقه
                    </p>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      customized ? "bg-app-accent-soft text-app-accent" : "bg-app-card-2 text-app-muted",
                    )}
                  >
                    {customized ? "اختصاصی" : "پیش‌فرض سالن"}
                  </span>
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] font-bold text-app-muted">قیمت من (تومان)</span>
                    <TextInput
                      inputMode="numeric"
                      dir="ltr"
                      className="h-11 text-end"
                      placeholder={toPersianDigits(entry.service.priceToman)}
                      value={draft.price}
                      onChange={(e) => setDrafts((d) => ({ ...d, [entry.serviceId]: { ...draft, price: normalizeDigits(e.target.value).replace(/\D/g, "") } }))}
                    />
                  </label>
                  <label className="w-24">
                    <span className="mb-1 block text-[11px] font-bold text-app-muted">دقیقه</span>
                    <TextInput
                      inputMode="numeric"
                      dir="ltr"
                      className="h-11 text-end"
                      placeholder={toPersianDigits(entry.service.durationMinutes)}
                      value={draft.duration}
                      onChange={(e) => setDrafts((d) => ({ ...d, [entry.serviceId]: { ...draft, duration: normalizeDigits(e.target.value).replace(/\D/g, "") } }))}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSave(entry)}
                    disabled={!dirty || savingId === entry.serviceId}
                    aria-label={`ذخیره ${entry.service.name}`}
                    className={cx(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition active:scale-90 disabled:opacity-40",
                      savedId === entry.serviceId ? "bg-app-done text-white" : "bg-app-accent text-app-accent-ink",
                    )}
                  >
                    <Check className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
