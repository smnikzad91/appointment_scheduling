"use client";

import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import ReviewModeration from "@/components/app/ReviewModeration";
import { ListSkeleton, PageHeader } from "@/components/app/ui";

export default function SalonReviewsPage() {
  const token = useApiAccessToken();
  return (
    <>
      <PageHeader
        title="نظرات مشتریان"
        subtitle="نظرهای درباره سالن و آرایشگرها پس از تایید شما در صفحه سالن نمایش داده می‌شوند."
      />
      {token ? <ReviewModeration token={token} scope="salon" /> : <ListSkeleton rows={3} />}
    </>
  );
}
