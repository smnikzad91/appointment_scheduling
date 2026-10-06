"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, listMyServices, setMySalonHandle, type OwnerSalon, type OwnerService } from "@/lib/api/ownerSalon";
import { INDEPENDENT_BADGE, isIndependent, placeLabel } from "@/lib/independent";
import ShareKit, { type ShareSubject } from "@/components/app/ShareKit";
import { ErrorBanner, ListSkeleton, PageHeader } from "@/components/app/ui";

/** Share kit for a salon — or an independent stylist's own business: link, QR code and poster. */
export default function SalonSharePage() {
  const token = useApiAccessToken();
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [services, setServices] = useState<OwnerService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    Promise.all([getMySalon(token), listMyServices(token).catch(() => [])])
      .then(([s, sv]) => {
        setError(null);
        setSalon(s);
        setServices(sv);
      })
      .catch(() => setError("دریافت اطلاعات انجام نشد"));
  }, [token, retry]);

  const subject = useMemo<ShareSubject | null>(() => {
    if (!salon) return null;
    const independent = isIndependent(salon);
    const place = [salon.city, salon.province && salon.province !== salon.city ? salon.province : null].filter(Boolean).join("، ");
    const title = independent
      ? salon.serviceLocations.includes("IN_SALON") && salon.hostSalonName
        ? `${INDEPENDENT_BADGE} ${placeLabel("IN_SALON", salon.hostSalonName)}`
        : INDEPENDENT_BADGE
      : "سالن زیبایی";
    return {
      handle: salon.handle ?? salon.slug,
      customHandle: salon.handle,
      poster: {
        name: salon.name,
        title,
        specialties: services.filter((s) => s.active).map((s) => s.name),
        place,
        coverUrl: salon.coverImageUrl,
        avatarUrl: salon.logoUrl,
        avatarShape: independent ? "circle" : "square",
        brandColor: salon.brandColor,
      },
    };
  }, [salon, services]);

  return (
    <>
      <PageHeader title="کیت معرفی" subtitle="لینک مستقیم رزرو، کد QR و پوستر آماده برای استوری و چاپ" />
      {error && <ErrorBanner onRetry={() => setRetry((r) => r + 1)}>{error}</ErrorBanner>}
      {!subject || !token ? (
        !error && <ListSkeleton rows={4} />
      ) : (
        <ShareKit
          subject={subject}
          saveHandle={async (h) => {
            const saved = await setMySalonHandle(token, h);
            setSalon((s) => (s ? { ...s, handle: saved.handle } : s));
            return saved.handle;
          }}
        />
      )}
    </>
  );
}
