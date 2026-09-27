"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import { listReviewsForModeration, type ReviewScope } from "@/lib/api/reviews";
import { toPersianDigits } from "@/lib/persian";
import { cx } from "./ui";

/**
 * Link to the review moderation page with the number of reviews waiting for approval.
 * `onlyWhenPending` hides it until there's something to approve (used on the home screens).
 */
export default function ReviewsLinkCard({
  token,
  scope,
  onlyWhenPending,
  className,
}: {
  token: string | null;
  scope: ReviewScope;
  onlyWhenPending?: boolean;
  className?: string;
}) {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    listReviewsForModeration(token, scope, "PENDING")
      .then((list) => setPending(list.length))
      .catch(() => setPending(null));
  }, [token, scope]);

  if (onlyWhenPending && !pending) return null;

  return (
    <Link
      href={scope === "salon" ? "/salon/reviews" : "/stylist/reviews"}
      className={cx("flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app active:scale-[0.99]", className)}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
        <MessageSquareText className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-app-ink">{onlyWhenPending ? "نظرهای تازه مشتری‌ها" : "نظرات مشتریان"}</span>
        <span className="block text-xs text-app-muted">
          {pending ? `${toPersianDigits(pending)} نظر منتظر تایید شما` : "تایید یا پنهان کردن نظرها و امتیازها"}
        </span>
      </span>
      {!!pending && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-app-pending px-1.5 text-xs font-black text-white">
          {toPersianDigits(pending)}
        </span>
      )}
      <ChevronLeft className="h-4 w-4 text-app-muted" aria-hidden />
    </Link>
  );
}
