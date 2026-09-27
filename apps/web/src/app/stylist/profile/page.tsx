"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, updateMyStylistProfile, type SelfStylist } from "@/lib/api/stylistSelf";
import { uploadImage } from "@/lib/uploadImage";
import { toPersianDigits } from "@/lib/persian";
import { Avatar, Button, Card, ErrorBanner, Field, ListSkeleton, PageHeader, SectionTitle, TextArea, cx } from "@/components/app/ui";

const BIO_MAX = 300;

export default function StylistProfilePage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    getMyStylistProfile(token)
      .then((p) => {
        setError(null);
        setProfile(p);
        setBio(p.bio ?? "");
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  useEffect(load, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setProfile(await updateMyStylistProfile(token, { bio }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("ذخیره تغییرات انجام نشد");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, "stylists");
      setProfile(await updateMyStylistProfile(token, { avatarUrl: url }));
    } catch {
      setError("آپلود تصویر انجام نشد");
    } finally {
      setUploading(false);
    }
  }

  if (!profile) return error ? <ErrorBanner onRetry={load}>{error}</ErrorBanner> : <ListSkeleton rows={3} />;

  const bioChanged = bio !== (profile.bio ?? "");

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader title="پروفایل" />

      <Card className="flex flex-col items-center p-6 text-center">
        <label className="relative cursor-pointer active:scale-95">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={104} className="ring-4 ring-app-accent-soft" />
          <span className="absolute bottom-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-app-card bg-app-accent text-app-accent-ink">
            <Camera className="h-4 w-4" aria-hidden />
          </span>
          <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={handleAvatarChange} aria-label="تغییر تصویر پروفایل" />
        </label>
        <p className="mt-4 text-xl font-black text-app-ink">{profile.displayName}</p>
        <span
          className={cx(
            "mt-2 rounded-full px-3 py-1 text-xs font-bold",
            profile.active ? "bg-app-done/12 text-app-done" : "bg-app-muted/12 text-app-muted",
          )}
        >
          {profile.active ? "فعال — قابل رزرو برای مشتری‌ها" : "غیرفعال — فعلاً قابل رزرو نیستید"}
        </span>
        {uploading && <p className="mt-2 text-xs text-app-muted">در حال آپلود تصویر…</p>}
      </Card>
      <p className="mt-2 px-1 text-xs leading-6 text-app-muted">نام نمایشی و فعال بودن حساب را صاحب سالن تعیین می‌کند.</p>

      <SectionTitle>درباره من</SectionTitle>
      <Field label="" hint={`${toPersianDigits(bio.length)} از ${toPersianDigits(BIO_MAX)} نویسه — در صفحه سالن کنار نام شما نمایش داده می‌شود.`}>
        <TextArea
          rows={5}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSaved(false);
          }}
          placeholder="چند خط درباره تخصص و سابقه‌تان بنویسید؛ مثلاً «۸ سال سابقه در رنگ و لایت مو»"
        />
      </Field>

      <div className="mt-4">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Button type="submit" block busy={saving} disabled={!bioChanged && !saving} icon={saved ? Check : undefined}>
          {saved ? "ذخیره شد" : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}
