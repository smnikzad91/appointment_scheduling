"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistHandle, getMyStylistProfile, setMyStylistHandle, type SelfStylist } from "@/lib/api/stylistSelf";
import ShareKit, { type ShareSubject } from "@/components/app/ShareKit";
import { ErrorBanner, ListSkeleton, PageHeader } from "@/components/app/ui";

/** A salon stylist's share kit: their own link (booking with them), QR code and poster. */
export default function StylistSharePage() {
  const token = useApiAccessToken();
  const [me, setMe] = useState<SelfStylist | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMyStylistProfile(token), getMyStylistHandle(token)])
      .then(([p, h]) => {
        setError(null);
        setMe(p);
        setHandle(h.handle);
      })
      .catch(() => setError("دریافت اطلاعات انجام نشد"));
  }, [token, retry]);

  const subject = useMemo<ShareSubject | null>(() => {
    if (!me || !handle) return null;
    const place = [me.salon.city, me.salon.province && me.salon.province !== me.salon.city ? me.salon.province : null].filter(Boolean).join("، ");
    return {
      handle,
      customHandle: handle,
      poster: {
        name: me.displayName,
        title: `آرایشگر ${me.salon.name}`,
        specialties: me.services.filter((s) => s.service.active).map((s) => s.service.name),
        place,
        coverUrl: me.coverImageUrl,
        avatarUrl: me.avatarUrl,
        avatarShape: "circle",
        brandColor: me.salon.brandColor ?? "#a34a30",
      },
    };
  }, [me, handle]);

  return (
    <>
      <PageHeader title="کیت معرفی من" subtitle="لینک رزرو مستقیم با شما، کد QR و پوستر برای استوری و چاپ" />
      {error && <ErrorBanner onRetry={() => setRetry((r) => r + 1)}>{error}</ErrorBanner>}
      {!subject || !token ? (
        !error && <ListSkeleton rows={4} />
      ) : (
        <ShareKit
          subject={subject}
          saveHandle={async (h) => {
            const saved = await setMyStylistHandle(token, h);
            setHandle(saved.handle);
            return saved.handle;
          }}
        />
      )}
    </>
  );
}
