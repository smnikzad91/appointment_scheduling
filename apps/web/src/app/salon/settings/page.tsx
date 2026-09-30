"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReviewsLinkCard from "@/components/app/ReviewsLinkCard";
import { SubscriptionCard, useMySubscription } from "@/components/app/Subscription";
import { Check, ChevronLeft, Images, Calculator, BookOpen } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, updateMySalon, type OwnerSalon, type UpdateSalonInput, SALON_UPDATED_EVENT } from "@/lib/api/ownerSalon";
import { toPersianDigits } from "@/lib/persian";
import ProfilePhotos, { type PhotoPatch } from "@/components/app/ProfilePhotos";
import LocationPickerLoader from "@/components/salon-dashboard/LocationPickerLoader";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
import { placeCenter } from "@appointment-scheduling/iran-locations";
import { persianApiError } from "@/lib/api/errorMessages";
import { Button, Card, ErrorBanner, Field, ListSkeleton, PageHeader, SectionTitle, TextArea, TextInput, Toggle, cx, LinkCard } from "@/components/app/ui";
import { SERVICE_LOCATIONS, SERVICE_LOCATION_HINT, SERVICE_LOCATION_LABEL, isIndependent } from "@/lib/independent";
import Sep from "@/components/common/Sep";

// Curated brand colors that read well on the public salon page; the last swatch opens a picker.
const SELECT_CLASS =
  "h-12 w-full appearance-none rounded-2xl border border-app-line bg-app-card px-4 text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/15 disabled:opacity-50";

const BRAND_SWATCHES = ["#a34a30", "#c2185b", "#8e44ad", "#1f6f78", "#2e7d32", "#b8860b", "#37474f"];

export default function SalonSettingsPage() {
  const token = useApiAccessToken();
  const subscription = useMySubscription(token);
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [form, setForm] = useState<UpdateSalonInput>({});
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!token) return;
    getMySalon(token)
      .then((s) => {
        setLoadError(null);
        setSalon(s);
        setForm({
          name: s.name,
          description: s.description ?? "",
          province: s.province ?? "",
          city: s.city,
          address: s.address,
          phone: s.phone,
          instagram: s.instagram ?? "",
          brandColor: s.brandColor,
          latitude: s.latitude ?? undefined,
          longitude: s.longitude ?? undefined,
          ...(isIndependent(s) && { serviceLocations: s.serviceLocations, serviceArea: s.serviceArea ?? "" }),
        });
      })
      .catch(() => setLoadError("خطا در دریافت اطلاعات سالن"));
  }, [token]);

  useEffect(load, [load]);

  function update(patch: UpdateSalonInput) {
    setSaved(false);
    setDirty(true);
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (form.serviceLocations && form.serviceLocations.length === 0) return setError("دست‌کم یک محل ارائه خدمات را انتخاب کنید");
    setSaving(true);
    setError(null);
    try {
      setSalon(await updateMySalon(token, form));
      window.dispatchEvent(new Event(SALON_UPDATED_EVENT));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(persianApiError(err, "ذخیره تغییرات انجام نشد، دوباره تلاش کنید"));
    } finally {
      setSaving(false);
    }
  }

  async function savePhotos(patch: PhotoPatch) {
    if (!token) return;
    // Logo is the salon's "avatar" — map the shared editor's field name onto the salon's.
    const updated = await updateMySalon(token, {
      ...(patch.avatarUrl !== undefined && { logoUrl: patch.avatarUrl }),
      ...(patch.coverImageUrl !== undefined && { coverImageUrl: patch.coverImageUrl }),
    });
    setSalon(updated);
    window.dispatchEvent(new Event(SALON_UPDATED_EVENT));
  }

  if (loadError) return <ErrorBanner onRetry={load}>{loadError}</ErrorBanner>;
  if (!salon) return <ListSkeleton rows={5} />;

  const brand = form.brandColor ?? salon.brandColor;
  const independent = isIndependent(salon);
  const locations = form.serviceLocations ?? [];
  const isCustomColor = !BRAND_SWATCHES.includes(brand.toLowerCase());

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={independent ? "تنظیمات کسب‌وکار" : "تنظیمات سالن"}
        subtitle={independent ? "این اطلاعات در صفحه رزرو شما به مشتری‌ها نشان داده می‌شود." : "این اطلاعات در صفحه رزرو سالن به مشتری‌ها نشان داده می‌شود."}
      />

      {/* Cover + logo, laid out like the public page */}
      <ProfilePhotos
        name={form.name || salon.name}
        coverUrl={salon.coverImageUrl}
        avatarUrl={salon.logoUrl}
        avatarLabel="لوگو"
        avatarShape="square"
        folder="salons"
        onSave={savePhotos}
      />

      <Link
        href="/salon/gallery"
        className="mt-3 flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
          <Images className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-app-ink">گالری نمونه کارها</span>
          <span className="block text-xs text-app-muted">عکس کارهای سالن و آرایشگرها در صفحه رزرو</span>
        </span>
        <ChevronLeft className="h-4 w-4 text-app-muted" aria-hidden />
      </Link>
      <ReviewsLinkCard token={token} scope="salon" className="mt-3" />
      <LinkCard
        href="/salon/accounting"
        icon={Calculator}
        title="حسابداری"
        subtitle={independent ? "درآمد، هزینه‌ها و سود خالص ماه" : "درآمد، سهم آرایشگرها، پرداخت‌ها و هزینه‌ها"}
        className="mt-3"
      />
      <LinkCard href="/tutorials?role=owner" icon={BookOpen} title="راهنمای استفاده" subtitle="راهنمای تصویری قدم‌به‌قدم همه بخش‌های پنل سالن" className="mt-3" />

      {subscription && (
        <div id="subscription" className="scroll-mt-20">
          <SectionTitle>اشتراک</SectionTitle>
          <SubscriptionCard sub={subscription} />
        </div>
      )}

      <SectionTitle>{independent ? "اطلاعات کسب‌وکار" : "اطلاعات سالن"}</SectionTitle>
      <Card className="flex flex-col gap-4 p-4">
        <Field label={independent ? "نام کاری" : "نام سالن"}>
          <TextInput value={form.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label={independent ? "درباره شما" : "درباره سالن"}>
          <TextArea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder={independent ? "چند خط درباره خودتان، تخصص‌ها و سابقه کار" : "چند خط درباره سالن، تخصص‌ها و فضای آن"}
          />
        </Field>
        <ProvinceCitySelect
          value={{ province: form.province ?? "", city: form.city ?? "" }}
          onChange={(v) => update(v)}
          selectClassName={SELECT_CLASS}
          labelClassName="px-1 text-[13px] font-bold text-app-muted"
        />
        {!salon.province && !form.province && (
          <p className="-mt-2 rounded-2xl bg-app-pending/10 px-3 py-2 text-xs leading-6 text-app-pending">
            استان سالن ثبت نشده است؛ آن را انتخاب کنید تا مشتری‌ها در جستجوی استان و شهر، سالن شما را پیدا کنند.
          </p>
        )}
        <Field label="تلفن">
          <TextInput type="tel" inputMode="tel" dir="ltr" className="text-end" value={form.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} />
        </Field>
        <Field
          label={independent ? "آدرس محل کار" : "آدرس دقیق"}
          hint={independent && !locations.includes("STUDIO") ? "فقط مشتری‌ای که نوبت گرفته آن را می‌بیند" : "خیابان، کوچه، پلاک، طبقه"}
        >
          <TextArea rows={2} value={form.address ?? ""} onChange={(e) => update({ address: e.target.value })} />
        </Field>
        <Field label="اینستاگرام">
          <div className="relative">
            <TextInput dir="ltr" className="pe-4 ps-9 text-end" value={form.instagram ?? ""} onChange={(e) => update({ instagram: e.target.value.replace(/^@/, "") })} placeholder="rose.salon" />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">@</span>
          </div>
        </Field>
      </Card>

      {independent && (
        <>
          <SectionTitle>محل ارائه خدمات</SectionTitle>
          <Card className="flex flex-col divide-y divide-app-line p-0">
            {SERVICE_LOCATIONS.map((loc) => (
              <div key={loc} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-app-ink">{SERVICE_LOCATION_LABEL[loc]}</p>
                  <p className="mt-0.5 text-xs leading-5 text-app-muted">{SERVICE_LOCATION_HINT[loc]}</p>
                </div>
                <Toggle
                  checked={locations.includes(loc)}
                  onChange={(on) => update({ serviceLocations: on ? [...locations, loc] : locations.filter((l) => l !== loc) })}
                  label={SERVICE_LOCATION_LABEL[loc]}
                />
              </div>
            ))}
            {locations.includes("CLIENT_HOME") && (
              <div className="p-4">
                <Field label="محدوده خدمات در منزل" hint="مثلاً کل قائم‌شهر و ساری">
                  <TextInput maxLength={200} value={form.serviceArea ?? ""} onChange={(e) => update({ serviceArea: e.target.value })} />
                </Field>
              </div>
            )}
          </Card>
        </>
      )}

      <SectionTitle>موقعیت روی نقشه</SectionTitle>
      <Card className="overflow-hidden p-0">
        <div className="h-56">
          <LocationPickerLoader
            value={form.latitude != null && form.longitude != null ? { lat: form.latitude, lng: form.longitude } : null}
            onChange={({ lat, lng }) => update({ latitude: lat, longitude: lng })}
            center={(() => {
              const c = placeCenter(form.province ?? "", form.city ?? "");
              return c ? { lat: c[0], lng: c[1] } : null;
            })()}
          />
        </div>
        <p className="px-4 py-3 text-xs leading-6 text-app-muted">
          {form.latitude != null && form.longitude != null ? (
            <>
              روی نقشه بزنید یا پین را بکشید تا جابه‌جا شود<Sep />
              <span dir="ltr">{toPersianDigits(`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`)}</span>
            </>
          ) : (
            "روی محل سالن در نقشه بزنید تا مشتری‌ها بتوانند مسیریابی کنند."
          )}
        </p>
      </Card>

      <SectionTitle>رنگ برند</SectionTitle>
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {BRAND_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update({ brandColor: color })}
              aria-label={`رنگ ${color}`}
              aria-pressed={brand.toLowerCase() === color}
              className="flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-app-card transition active:scale-90"
              style={{ backgroundColor: color, boxShadow: brand.toLowerCase() === color ? `0 0 0 3px var(--app-card), 0 0 0 5px ${color}` : undefined }}
            >
              {brand.toLowerCase() === color && <Check className="h-5 w-5 text-white" aria-hidden />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            aria-label="رنگ دلخواه"
            className={cx("relative h-11 w-11 overflow-hidden rounded-full active:scale-90", !isCustomColor && "opacity-80")}
            style={{
              background: isCustomColor ? brand : "conic-gradient(#e53935, #fdd835, #43a047, #1e88e5, #8e24aa, #e53935)",
              boxShadow: isCustomColor ? `0 0 0 3px var(--app-card), 0 0 0 5px ${brand}` : undefined,
            }}
          >
            <input ref={colorInputRef} type="color" value={brand} onChange={(e) => update({ brandColor: e.target.value })} className="sr-only" tabIndex={-1} />
          </button>
        </div>
        <p className="mt-3 text-xs text-app-muted">دکمه‌ها و جزئیات صفحه رزرو سالن با این رنگ نمایش داده می‌شوند.</p>
      </Card>

      {/* Save bar — pinned just above the tab bar, only while there's something to save. */}
      {(dirty || saved || error) && (
        <div className="app-rise sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mt-6">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <Button type="submit" block busy={saving} icon={saved ? Check : undefined} className="shadow-[0_12px_30px_-12px_rgb(0_0_0/0.45)]">
            {saved ? "ذخیره شد" : "ذخیره تغییرات"}
          </Button>
        </div>
      )}
    </form>
  );
}
