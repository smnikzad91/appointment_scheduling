"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Wallet } from "lucide-react";
import ProfilePhotos, { type PhotoPatch } from "@/components/app/ProfilePhotos";
import GalleryManager from "@/components/app/GalleryManager";
import ReviewsLinkCard from "@/components/app/ReviewsLinkCard";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { STYLIST_UPDATED_EVENT, getMyStylistProfile, updateMyStylistProfile, type SelfStylist } from "@/lib/api/stylistSelf";
import { toPersianDigits } from "@/lib/persian";
import { Button, ErrorBanner, Field, ListSkeleton, PageHeader, SectionTitle, TextArea, cx, LinkCard } from "@/components/app/ui";

const BIO_MAX = 300;

export default function StylistProfilePage() {
  const token = useApiAccessToken();
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function savePhotos(patch: PhotoPatch) {
    if (!token) return;
    setProfile(await updateMyStylistProfile(token, patch));
    window.dispatchEvent(new Event(STYLIST_UPDATED_EVENT));
    // The API mirrors the stylist photo onto the account; refresh the session so the app bar shows it.
    if (patch.avatarUrl !== undefined) await updateSession({ avatar: patch.avatarUrl ?? "" });
  }

  if (!profile) return error ? <ErrorBanner onRetry={load}>{error}</ErrorBanner> : <ListSkeleton rows={3} />;

  const bioChanged = bio !== (profile.bio ?? "");

  return (
    <>
    <form onSubmit={handleSubmit}>
      <PageHeader title="پروفایل" />

      <ProfilePhotos
        name={profile.displayName}
        coverUrl={profile.coverImageUrl}
        avatarUrl={profile.avatarUrl}
        avatarLabel="عکس پروفایل"
        folder="stylists"
        onSave={savePhotos}
      />
      <span
        className={cx(
          "mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold",
          profile.active ? "bg-app-done/12 text-app-done" : "bg-app-muted/12 text-app-muted",
        )}
      >
        {profile.active ? "فعال — قابل رزرو برای مشتری‌ها" : "غیرفعال — فعلاً قابل رزرو نیستید"}
      </span>
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

      <ReviewsLinkCard token={token} scope="stylist" className="mt-6" />
      <LinkCard href="/stylist/earnings" icon={Wallet} title="درآمد من" subtitle="سهم شما از نوبت‌ها، پرداخت‌های سالن و مانده حساب" className="mt-3" />

      <SectionTitle>نمونه کارهای من</SectionTitle>
      <p className="-mt-1 mb-3 px-1 text-xs leading-6 text-app-muted">
        عکس کارهایتان در صفحه سالن کنار نام شما نمایش داده می‌شود و به مشتری‌ها کمک می‌کند شما را انتخاب کنند.
      </p>
      {token && <GalleryManager token={token} scope="stylist" />}
    </>
  );
}
