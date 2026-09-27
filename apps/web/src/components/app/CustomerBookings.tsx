"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CalendarX2, RotateCcw, Star } from "lucide-react";
import { cancelBooking, getMyBookings, leaveReview, type CustomerBooking } from "@/lib/api/customerBookings";
import { SalonApiError } from "@/lib/api/salonApiClient";
import { formatMinutesAsClock, formatToman, toPersianDigits } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import { StatusChip, relativeDayLabel } from "./appointments";
import Sheet from "./Sheet";
import { Button, ChipTabs, EmptyState, ErrorBanner, ListSkeleton, PageHeader, TextArea, cx, riseStyle } from "./ui";

type Tab = "upcoming" | "past";

/**
 * A customer's bookings (upcoming / past) with cancel, review and "book again". Used by the
 * signed-in customer dashboard (NextAuth session token) and by /my-bookings (OTP token).
 */
export default function CustomerBookings({
  token,
  onUnauthorized,
  headerAction,
}: {
  token: string | null;
  /** Called when the token is rejected (e.g. an expired OTP session). */
  onUnauthorized?: () => void;
  headerAction?: React.ReactNode;
}) {
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

  const [cancelTarget, setCancelTarget] = useState<CustomerBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CustomerBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!token) return;
    getMyBookings(token)
      .then((list) => {
        setError(null);
        setBookings(list);
      })
      .catch((err) => {
        if (err instanceof SalonApiError && err.status === 401 && onUnauthorized) onUnauthorized();
        else setError("خطا در دریافت نوبت‌ها");
      });
  }, [token, onUnauthorized]);

  useEffect(reload, [reload]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date().toISOString();
    const all = bookings ?? [];
    const isUpcoming = (b: CustomerBooking) => (b.status === "PENDING" || b.status === "CONFIRMED") && b.endAt >= now;
    return {
      upcoming: all.filter(isUpcoming).sort((a, b) => a.startAt.localeCompare(b.startAt)),
      past: all.filter((b) => !isUpcoming(b)).sort((a, b) => b.startAt.localeCompare(a.startAt)),
    };
  }, [bookings]);

  async function confirmCancel() {
    if (!token || !cancelTarget) return;
    setCancelling(true);
    setSheetError(null);
    try {
      await cancelBooking(token, cancelTarget.id);
      setCancelTarget(null);
      reload();
    } catch {
      setSheetError("لغو نوبت انجام نشد، دوباره تلاش کنید");
    } finally {
      setCancelling(false);
    }
  }

  function openReview(booking: CustomerBooking) {
    setRating(5);
    setComment("");
    setSheetError(null);
    setReviewTarget(booking);
  }

  async function submitReview() {
    if (!token || !reviewTarget) return;
    setReviewing(true);
    setSheetError(null);
    try {
      await leaveReview(token, reviewTarget.id, rating, comment.trim() || undefined);
      setReviewTarget(null);
      reload();
    } catch {
      setSheetError("ثبت نظر انجام نشد");
    } finally {
      setReviewing(false);
    }
  }

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <PageHeader title="نوبت‌های من" action={headerAction} />
      <ChipTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "پیش‌رو", count: upcoming.length },
          { value: "past", label: "گذشته" },
        ]}
      />

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {!bookings ? (
        !error && <ListSkeleton />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === "upcoming" ? CalendarPlus : CalendarX2}
          title={tab === "upcoming" ? "نوبت پیش‌رویی ندارید" : "هنوز نوبتی نداشته‌اید"}
          hint={tab === "upcoming" ? "از صفحه سالن مورد علاقه‌تان آنلاین نوبت بگیرید؛ نوبت‌ها اینجا نمایش داده می‌شوند." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((b, i) => {
            const wall = toSalonWallTime(b.startAt);
            const canCancel = b.status === "PENDING" || b.status === "CONFIRMED";
            const canReview = b.status === "COMPLETED" && !b.review;
            return (
              <article
                key={b.id}
                style={riseStyle(i)}
                className={cx(
                  "app-rise rounded-3xl border border-app-line bg-app-card p-4 shadow-app",
                  (b.status === "CANCELLED" || b.status === "NO_SHOW") && "opacity-65",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-app-ink">{b.salon.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-app-muted">
                      {b.services.map((s) => s.service.name).join("، ")} · {b.stylist.displayName}
                    </p>
                  </div>
                  <StatusChip status={b.status} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-app-card-2 px-3.5 py-2.5 text-sm">
                  <span className="font-bold text-app-ink">
                    {relativeDayLabel(wall.dateKey)} · ساعت {formatMinutesAsClock(wall.minuteOfDay)}
                  </span>
                  <span className="text-app-muted">{formatToman(b.priceToman)}</span>
                </div>

                {b.review && (
                  <p className="mt-3 flex items-center gap-1 text-sm text-app-muted">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cx("h-4 w-4", n <= b.review!.rating ? "fill-app-pending text-app-pending" : "text-app-line")} aria-hidden />
                    ))}
                    {b.review.comment && <span className="ms-1 truncate">{b.review.comment}</span>}
                  </p>
                )}

                {(canCancel || canReview || tab === "past") && (
                  <div className="mt-3 flex gap-2">
                    {canReview && (
                      <Button icon={Star} className="h-11 flex-1" onClick={() => openReview(b)}>
                        ثبت نظر
                      </Button>
                    )}
                    {tab === "past" && (
                      <Link
                        href={`/s/${b.salon.slug}`}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-app-line bg-app-card text-sm font-bold text-app-ink active:bg-app-card-2"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                        رزرو دوباره
                      </Link>
                    )}
                    {canCancel && (
                      <Button variant="danger" className="h-11 flex-1" onClick={() => { setSheetError(null); setCancelTarget(b); }}>
                        لغو نوبت
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Sheet open={cancelTarget !== null} onClose={() => setCancelTarget(null)} title="لغو نوبت">
        {cancelTarget && (
          <>
            <p className="mb-5 text-[15px] leading-7 text-app-ink">
              نوبت {relativeDayLabel(toSalonWallTime(cancelTarget.startAt).dateKey)} ساعت{" "}
              {formatMinutesAsClock(toSalonWallTime(cancelTarget.startAt).minuteOfDay)} در {cancelTarget.salon.name} لغو شود؟
            </p>
            {sheetError && <ErrorBanner>{sheetError}</ErrorBanner>}
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                منصرف شدم
              </Button>
              <Button variant="danger" busy={cancelling} onClick={confirmCancel}>
                بله، لغو شود
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        title="نظر شما"
        footer={
          <Button block busy={reviewing} onClick={submitReview}>
            ثبت نظر
          </Button>
        }
      >
        {reviewTarget && (
          <>
            <p className="mb-4 text-sm text-app-muted">تجربه‌تان از {reviewTarget.salon.name} چطور بود؟</p>
            <div className="mb-5 flex justify-center gap-2" dir="ltr" role="radiogroup" aria-label="امتیاز">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${toPersianDigits(n)} ستاره`}
                  onClick={() => setRating(n)}
                  className="p-1 active:scale-90"
                >
                  <Star className={cx("h-10 w-10 transition", n <= rating ? "fill-app-pending text-app-pending" : "text-app-line")} aria-hidden />
                </button>
              ))}
            </div>
            <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نظرتان را بنویسید (اختیاری)" />
            {sheetError && <p className="mt-3 text-sm font-medium text-app-danger">{sheetError}</p>}
          </>
        )}
      </Sheet>
    </>
  );
}
