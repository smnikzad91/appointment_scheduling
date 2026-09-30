"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon } from "@/lib/api/ownerSalon";
import { isIndependent } from "@/lib/independent";
import ReviewModeration from "@/components/app/ReviewModeration";
import { ListSkeleton, PageHeader } from "@/components/app/ui";

export default function SalonReviewsPage() {
  const token = useApiAccessToken();
  const [independent, setIndependent] = useState(false);
  useEffect(() => {
    if (!token) return;
    getMySalon(token)
      .then((s) => setIndependent(isIndependent(s)))
      .catch(() => {});
  }, [token]);
  return (
    <>
      <PageHeader
        title="نظرات مشتریان"
        subtitle={
          independent
            ? "نظرهای مشتری‌ها درباره شما پس از تایید در صفحه رزرو شما نمایش داده می‌شوند."
            : "نظرهای درباره سالن و آرایشگرها پس از تایید شما در صفحه سالن نمایش داده می‌شوند."
        }
      />
      {token ? <ReviewModeration token={token} scope="salon" independent={independent} /> : <ListSkeleton rows={3} />}
    </>
  );
}
