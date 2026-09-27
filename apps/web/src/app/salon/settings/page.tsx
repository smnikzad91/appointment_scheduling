"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, updateMySalon, type OwnerSalon, type UpdateSalonInput } from "@/lib/api/ownerSalon";
import { uploadImage } from "@/lib/uploadImage";
import { toPersianDigits } from "@/lib/persian";
import LocationPickerLoader from "@/components/salon-dashboard/LocationPickerLoader";
import { Avatar, Button, Card, ErrorBanner, Field, ListSkeleton, PageHeader, SectionTitle, TextArea, TextInput, cx } from "@/components/app/ui";

// Curated brand colors that read well on the public salon page; the last swatch opens a picker.
const BRAND_SWATCHES = ["#a34a30", "#c2185b", "#8e44ad", "#1f6f78", "#2e7d32", "#b8860b", "#37474f"];

export default function SalonSettingsPage() {
  const token = useApiAccessToken();
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [form, setForm] = useState<UpdateSalonInput>({});
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
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
          city: s.city,
          address: s.address,
          phone: s.phone,
          instagram: s.instagram ?? "",
          brandColor: s.brandColor,
          latitude: s.latitude ?? undefined,
          longitude: s.longitude ?? undefined,
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
    setSaving(true);
    setError(null);
    try {
      setSalon(await updateMySalon(token, form));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("ذخیره تغییرات انجام نشد، دوباره تلاش کنید");
    } finally {
      setSaving(false);
    }
  }

  async function handleImage(kind: "logo" | "cover", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploading(kind);
    setError(null);
    try {
      const url = await uploadImage(file, "salons");
      setSalon(await updateMySalon(token, kind === "logo" ? { logoUrl: url } : { coverImageUrl: url }));
    } catch {
      setError(kind === "logo" ? "آپلود لوگو انجام نشد" : "آپلود تصویر کاور انجام نشد");
    } finally {
      setUploading(null);
    }
  }

  if (loadError) return <ErrorBanner onRetry={load}>{loadError}</ErrorBanner>;
  if (!salon) return <ListSkeleton rows={5} />;

  const brand = form.brandColor ?? salon.brandColor;
  const isCustomColor = !BRAND_SWATCHES.includes(brand.toLowerCase());

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader title="تنظیمات سالن" subtitle="این اطلاعات در صفحه رزرو سالن به مشتری‌ها نشان داده می‌شود." />

      {/* Cover + logo, laid out like the public page */}
      <Card className="overflow-hidden p-0">
        <label className="relative block h-36 cursor-pointer bg-app-card-2">
          {salon.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salon.coverImageUrl} alt="کاور سالن" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-app-muted">
              <ImagePlus className="h-5 w-5" aria-hidden />
              افزودن تصویر کاور
            </span>
          )}
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <Camera className="h-3.5 w-3.5" aria-hidden />
            {uploading === "cover" ? "در حال آپلود…" : "تغییر کاور"}
          </span>
          <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={(e) => handleImage("cover", e)} aria-label="تغییر تصویر کاور" />
        </label>
        <div className="flex items-end gap-3 px-4 pb-4">
          <label className="relative -mt-9 cursor-pointer active:scale-95">
            <span className="block rounded-[22px] border-4 border-app-card">
              <Avatar name={form.name || salon.name} src={salon.logoUrl} size={72} className="rounded-[18px]" />
            </span>
            <span className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-app-card bg-app-accent text-app-accent-ink">
              <Camera className="h-4 w-4" aria-hidden />
            </span>
            <input type="file" accept="image/*" className="sr-only" disabled={uploading !== null} onChange={(e) => handleImage("logo", e)} aria-label="تغییر لوگو" />
          </label>
          <div className="min-w-0 pb-1">
            <p className="truncate font-black text-app-ink">{form.name || salon.name}</p>
            <p className="text-xs text-app-muted">{uploading === "logo" ? "در حال آپلود لوگو…" : "برای تغییر، روی تصویرها بزنید"}</p>
          </div>
        </div>
      </Card>

      <SectionTitle>اطلاعات سالن</SectionTitle>
      <Card className="flex flex-col gap-4 p-4">
        <Field label="نام سالن">
          <TextInput value={form.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label="درباره سالن">
          <TextArea rows={3} value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} placeholder="چند خط درباره سالن، تخصص‌ها و فضای آن" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="شهر">
            <TextInput value={form.city ?? ""} onChange={(e) => update({ city: e.target.value })} />
          </Field>
          <Field label="تلفن">
            <TextInput type="tel" inputMode="tel" dir="ltr" className="text-end" value={form.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} />
          </Field>
        </div>
        <Field label="آدرس">
          <TextArea rows={2} value={form.address ?? ""} onChange={(e) => update({ address: e.target.value })} />
        </Field>
        <Field label="اینستاگرام">
          <div className="relative">
            <TextInput dir="ltr" className="pe-4 ps-9 text-end" value={form.instagram ?? ""} onChange={(e) => update({ instagram: e.target.value.replace(/^@/, "") })} placeholder="rose.salon" />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-app-muted">@</span>
          </div>
        </Field>
      </Card>

      <SectionTitle>موقعیت روی نقشه</SectionTitle>
      <Card className="overflow-hidden p-0">
        <div className="h-56">
          <LocationPickerLoader
            value={form.latitude != null && form.longitude != null ? { lat: form.latitude, lng: form.longitude } : null}
            onChange={({ lat, lng }) => update({ latitude: lat, longitude: lng })}
          />
        </div>
        <p className="px-4 py-3 text-xs leading-6 text-app-muted">
          {form.latitude != null && form.longitude != null ? (
            <>
              روی نقشه بزنید یا پین را بکشید تا جابه‌جا شود ·{" "}
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
