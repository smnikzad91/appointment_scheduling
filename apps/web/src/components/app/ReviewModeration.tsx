"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, MessageSquareText, Star } from "lucide-react";
import { listReviewsForModeration, moderateReview, type ModerationReview, type ReviewScope, type ReviewStatus } from "@/lib/api/reviews";
import { persianApiError } from "@/lib/api/errorMessages";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";
import { Stars } from "@/components/common/StarRating";
import { Button, ChipTabs, EmptyState, ErrorBanner, ListSkeleton, StatTile, cx, riseStyle } from "./ui";

const EMPTY: Record<ReviewStatus, { title: string; hint: string }> = {
  PENDING: { title: "نظر تازه‌ای منتظر تایید نیست", hint: "نظرهای جدید مشتری‌ها پیش از نمایش در صفحه سالن اینجا می‌آیند." },
  APPROVED: { title: "هنوز نظری منتشر نشده", hint: "نظرهایی که تایید کنید در صفحه سالن نمایش داده می‌شوند." },
  REJECTED: { title: "نظر پنهانی ندارید", hint: "نظرهای ردشده برای مشتری‌ها نمایش داده نمی‌شوند." },
};

/**
 * Approve / hide customer reviews. scope="salon" (owner): every review of the salon, about the
 * salon or any of its stylists. scope="stylist": the reviews about the signed-in stylist.
 */
export default function ReviewModeration({ token, scope }: { token: string; scope: ReviewScope }) {
  const [reviews, setReviews] = useState<ModerationReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewStatus>("PENDING");
  const [busy, setBusy] = useState<string | null>(null); // `${id}:${status}`
  const [itemError, setItemError] = useState<{ id: string; message: string } | null>(null);

  const reload = useCallback(() => {
    listReviewsForModeration(token, scope)
      .then((list) => {
        setError(null);
        setReviews(list);
      })
      .catch(() => setError("دریافت نظرها انجام نشد"));
  }, [token, scope]);

  useEffect(reload, [reload]);

  async function setStatus(review: ModerationReview, status: "APPROVED" | "REJECTED") {
    setBusy(`${review.id}:${status}`);
    setItemError(null);
    try {
      const updated = await moderateReview(token, review.id, status);
      setReviews((list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? list);
    } catch (err) {
      setItemError({ id: review.id, message: persianApiError(err, "انجام نشد، دوباره تلاش کنید") });
    } finally {
      setBusy(null);
    }
  }

  if (!reviews) return error ? <ErrorBanner onRetry={reload}>{error}</ErrorBanner> : <ListSkeleton rows={3} />;

  const byStatus = (s: ReviewStatus) => reviews.filter((r) => r.status === s);
  const approved = byStatus("APPROVED");
  const ratings = approved.flatMap((r) => (r.rating === null ? [] : [r.rating]));
  const average = ratings.length > 0 ? ratings.reduce((sum, n) => sum + n, 0) / ratings.length : 0;
  const list = byStatus(tab);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="min-w-0 rounded-3xl border border-app-line bg-app-card p-4 shadow-app">
          <Star className="mb-3 h-5 w-5 text-amber-400" aria-hidden />
          <p className="text-[28px] font-black leading-none text-app-ink">{ratings.length > 0 ? toPersianDigits(average.toFixed(1)) : "—"}</p>
          <p className="mt-1.5 text-xs font-medium text-app-muted">
            میانگین {toPersianDigits(ratings.length)} امتیاز منتشرشده
          </p>
        </div>
        <StatTile icon={MessageSquareText} label="منتظر تایید شما" value={byStatus("PENDING").length} tone={byStatus("PENDING").length ? "pending" : "ink"} />
      </div>

      <ChipTabs<ReviewStatus>
        value={tab}
        onChange={setTab}
        options={[
          { value: "PENDING", label: "منتظر تایید", count: byStatus("PENDING").length },
          { value: "APPROVED", label: "منتشرشده" },
          { value: "REJECTED", label: "پنهان" },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={MessageSquareText} title={EMPTY[tab].title} hint={EMPTY[tab].hint} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((r, i) => (
            <article key={r.id} style={riseStyle(i)} className="app-rise rounded-3xl border border-app-line bg-app-card p-4 shadow-app">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-app-ink">{r.customerName}</p>
                  <p className="mt-0.5 truncate text-xs text-app-muted">
                    {toPersianDigits(formatSalonDate(r.appointment.startAt))}
                    {r.appointment.services.length > 0 && ` · ${r.appointment.services.join("، ")}`}
                  </p>
                </div>
                {r.rating !== null ? (
                  <Stars value={r.rating} size={16} emptyClassName="text-app-line" />
                ) : (
                  <span className="shrink-0 rounded-full bg-app-card-2 px-2.5 py-0.5 text-[11px] font-bold text-app-muted">بدون امتیاز</span>
                )}
              </div>

              {scope === "salon" && (
                <span
                  className={cx(
                    "mt-2.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    r.target === "SALON" ? "bg-app-accent-soft text-app-accent" : "bg-app-card-2 text-app-ink",
                  )}
                >
                  {r.target === "SALON" ? "درباره سالن" : `درباره ${r.stylist?.displayName ?? "آرایشگر"}`}
                </span>
              )}

              {r.comment ? (
                <p className="mt-2.5 whitespace-pre-line text-[15px] leading-7 text-app-ink">{r.comment}</p>
              ) : (
                <p className="mt-2.5 text-sm text-app-muted">بدون متن — فقط امتیاز</p>
              )}

              {itemError?.id === r.id && <p className="mt-2 text-sm font-medium text-app-danger">{itemError.message}</p>}

              <div className="mt-3 flex gap-2">
                {r.status !== "APPROVED" && (
                  <Button
                    className="h-11 flex-1"
                    icon={Check}
                    busy={busy === `${r.id}:APPROVED`}
                    disabled={busy !== null}
                    onClick={() => setStatus(r, "APPROVED")}
                  >
                    {r.status === "PENDING" ? "تایید و نمایش" : "نمایش دوباره"}
                  </Button>
                )}
                {r.status !== "REJECTED" && (
                  <Button
                    variant={r.status === "PENDING" ? "danger" : "secondary"}
                    className="h-11 flex-1"
                    icon={EyeOff}
                    busy={busy === `${r.id}:REJECTED`}
                    disabled={busy !== null}
                    onClick={() => setStatus(r, "REJECTED")}
                  >
                    {r.status === "PENDING" ? "رد" : "پنهان کردن"}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
