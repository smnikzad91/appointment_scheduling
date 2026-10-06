"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listMyStylists, type OwnerStylist } from "@/lib/api/ownerSalon";
import GalleryManager from "@/components/app/GalleryManager";
import { ListSkeleton, PageHeader } from "@/components/app/ui";

export default function SalonGalleryPage() {
  const token = useApiAccessToken();
  const [stylists, setStylists] = useState<OwnerStylist[]>([]);

  useEffect(() => {
    if (!token) return;
    // Only used for the "credited to" picker — the gallery still works if this fails.
    listMyStylists(token).then(setStylists).catch(() => setStylists([]));
  }, [token]);

  return (
    <>
      <PageHeader
        title="نمونه کارها"
        subtitle={`عکس کارهای انجام‌شده؛ در صفحه رزرو به مشتری‌ها نشان داده می‌شود.${
          stylists.length > 1 ? " هر عکس را می‌توانید به نام یک آرایشگر ثبت کنید." : ""
        }`}
      />
      {token ? <GalleryManager token={token} scope="salon" stylists={stylists.map((s) => ({ id: s.id, displayName: s.displayName }))} /> : <ListSkeleton />}
    </>
  );
}
