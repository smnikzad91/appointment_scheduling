"use client";

import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import ReviewModeration from "@/components/app/ReviewModeration";
import { ListSkeleton, PageHeader } from "@/components/app/ui";

export default function StylistReviewsPage() {
  const token = useApiAccessToken();
  return (
    <>
      <PageHeader title="نظرات درباره من" subtitle="نظرهایی که تایید کنید کنار نام شما در صفحه سالن نمایش داده می‌شوند." />
      {token ? <ReviewModeration token={token} scope="stylist" /> : <ListSkeleton rows={3} />}
    </>
  );
}
