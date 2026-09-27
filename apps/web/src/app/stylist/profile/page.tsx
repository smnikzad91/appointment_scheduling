"use client";

import { useEffect, useRef, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, updateMyStylistProfile, type SelfStylist } from "@/lib/api/stylistSelf";
import { uploadImage } from "@/lib/uploadImage";

export default function StylistProfilePage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    getMyStylistProfile(token)
      .then((p) => {
        setProfile(p);
        setBio(p.bio ?? "");
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateMyStylistProfile(token, { bio });
      setProfile(updated);
      setSaved(true);
    } catch {
      setError("خطا در ذخیره تغییرات");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadImage(file, "stylists");
      const updated = await updateMyStylistProfile(token, { avatarUrl: url });
      setProfile(updated);
    } catch {
      setError("خطا در آپلود تصویر");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!profile) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">پروفایل</h1>
      <p className="mb-6 text-sm text-gray-500">
        نام نمایشی و فعال‌بودن حساب شما توسط صاحب سالن مدیریت می‌شود؛ در این صفحه فقط بیوگرافی و تصویر خود را ویرایش می‌کنید.
      </p>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-lg font-bold text-gray-400 dark:bg-gray-800">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
          ) : (
            profile.displayName.trim().slice(0, 1)
          )}
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
        >
          {uploadingAvatar ? "در حال آپلود..." : "تغییر تصویر"}
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-sm">
          <span className="text-gray-500">نام نمایشی: </span>
          <span className="font-medium text-gray-900 dark:text-white">{profile.displayName}</span>
        </p>
        <p className="mt-1 text-sm">
          <span className="text-gray-500">وضعیت: </span>
          <span className={profile.active ? "text-emerald-600" : "text-gray-500"}>{profile.active ? "فعال" : "غیرفعال"}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">بیوگرافی</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="چند خط درباره تخصص و سابقه خود بنویسید"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>

        {error && <p className="text-sm text-rose-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">تغییرات ذخیره شد.</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}
