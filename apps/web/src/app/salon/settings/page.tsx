"use client";

import { useEffect, useRef, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, updateMySalon, type OwnerSalon, type UpdateSalonInput } from "@/lib/api/ownerSalon";
import { uploadImage } from "@/lib/uploadImage";

type FormState = UpdateSalonInput;

export default function SalonSettingsPage() {
  const token = useApiAccessToken();
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    getMySalon(token)
      .then((s) => {
        setSalon(s);
        setForm({
          name: s.name,
          description: s.description ?? "",
          city: s.city,
          address: s.address,
          phone: s.phone,
          instagram: s.instagram ?? "",
          brandColor: s.brandColor,
        });
      })
      .catch(() => setError("خطا در دریافت اطلاعات سالن"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateMySalon(token, form);
      setSalon(updated);
      setSaved(true);
    } catch {
      setError("خطا در ذخیره تغییرات");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const url = await uploadImage(file, "salons");
      const updated = await updateMySalon(token, { logoUrl: url });
      setSalon(updated);
    } catch {
      setError("خطا در آپلود لوگو");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploadingCover(true);
    setError(null);
    try {
      const url = await uploadImage(file, "salons");
      const updated = await updateMySalon(token, { coverImageUrl: url });
      setSalon(updated);
    } catch {
      setError("خطا در آپلود تصویر کاور");
    } finally {
      setUploadingCover(false);
    }
  }

  if (!salon) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">تنظیمات سالن</h1>

      <div className="mb-6 flex flex-col gap-4">
        <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {salon.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salon.coverImageUrl} alt="کاور سالن" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/70 disabled:opacity-60"
          >
            {uploadingCover ? "در حال آپلود..." : "تغییر تصویر کاور"}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-lg font-bold text-gray-400 dark:bg-gray-800">
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt="لوگو" className="h-full w-full object-cover" />
            ) : (
              salon.name.trim().slice(0, 1)
            )}
          </div>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
          >
            {uploadingLogo ? "در حال آپلود..." : "تغییر لوگو"}
          </button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="نام سالن">
          <input
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
        </Field>

        <Field label="توضیحات">
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="شهر">
            <input value={form.city ?? ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="input" />
          </Field>
          <Field label="تلفن">
            <input dir="ltr" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input text-end" />
          </Field>
        </div>

        <Field label="آدرس">
          <input value={form.address ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
        </Field>

        <Field label="اینستاگرام (بدون @)">
          <input dir="ltr" value={form.instagram ?? ""} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} className="input text-end" />
        </Field>

        <Field label="رنگ برند">
          <input
            type="color"
            value={form.brandColor ?? "#a34a30"}
            onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))}
            className="h-10 w-20 rounded-lg border border-gray-200 dark:border-gray-700"
          />
        </Field>

        {error && <p className="text-sm text-rose-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">تغییرات ذخیره شد.</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </form>

      <style jsx>{`
        .input {
          border-radius: 0.5rem;
          border-width: 1px;
          border-color: rgb(229 231 235);
          background: white;
          color: rgb(17 24 39);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        :global(.dark) .input {
          border-color: rgb(55 65 81);
          background: rgb(31 41 55);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}
