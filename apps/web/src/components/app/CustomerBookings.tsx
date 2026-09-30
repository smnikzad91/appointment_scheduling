"use client";

import { placeLabel } from "@/lib/independent";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CalendarX2, RotateCcw, Star, Trash2 } from "lucide-react";
import {
  cancelBooking,
  deleteReview,
  getMyBookings,
  leaveReview,
  updateReview,
  type BookingReview,
  type CustomerBooking,
  type ReviewTarget,
} from "@/lib/api/customerBookings";
import { persianApiError } from "@/lib/api/errorMessages";
import { StarRatingInput, Stars } from "@/components/common/StarRating";
import { SalonApiError } from "@/lib/api/salonApiClient";
import { formatMinutesAsClock, formatToman } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import { StatusChip, relativeDayLabel } from "./appointments";
import Sheet from "./Sheet";
import { Button, ChipTabs, EmptyState, ErrorBanner, ListSkeleton, PageHeader, TextArea, cx, riseStyle } from "./ui";
import Sep from "@/components/common/Sep";

type Tab = "upcoming" | "past";

interface Draft {
  rating: number; // 0 = no stars (a comment alone is fine)
  comment: string;
}
const EMPTY_DRAFTS: Record<ReviewTarget, Draft> = { SALON: { rating: 0, comment: "" }, STYLIST: { rating: 0, comment: "" } };
const REVIEW_TARGETS: ReviewTarget[] = ["SALON", "STYLIST"];
const COMMENT_MAX = 500;

const REVIEW_STATUS: Record<BookingReview["status"], { label: string; className: string }> = {
  PENDING: { label: "در انتظار تایید", className: "bg-app-pending/12 text-app-pending" },
  APPROVED: { label: "منتشر شده", className: "bg-app-done/12 text-app-done" },
  REJECTED: { label: "منتشر نشد", className: "bg-app-muted/12 text-app-muted" },
};

/** An independent stylist is their own business: one review of them (the business's), not two. */
function missingTargets(b: CustomerBooking) {
  const targets: ReviewTarget[] = b.salon.kind === "INDEPENDENT" ? ["SALON"] : REVIEW_TARGETS;
  return targets.filter((t) => !b.reviews.some((r) => r.target === t));
}

/** Where an independent stylist's booking happens, with the address the customer needs. */
function bookingPlace(b: CustomerBooking): string | null {
  if (b.salon.kind !== "INDEPENDENT" || !b.serviceLocation) return null;
  const label = placeLabel(b.serviceLocation, b.salon.hostSalonName);
  const address = b.serviceLocation === "CLIENT_HOME" ? b.visitAddress : b.salon.address;
  return address ? `${label}: ${address}` : label;
}

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
  const [drafts, setDrafts] = useState<Record<ReviewTarget, Draft>>(EMPTY_DRAFTS);
  const [reviewing, setReviewing] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Editing one of the customer's own reviews.
  const [editing, setEditing] = useState<{ booking: CustomerBooking; review: BookingReview } | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>({ rating: 0, comment: "" });
  const [editBusy, setEditBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setDrafts(EMPTY_DRAFTS);
    setSheetError(null);
    setReviewTarget(booking);
  }

  function updateDraft(target: ReviewTarget, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [target]: { ...d[target], ...patch } }));
  }

  async function submitReview() {
    if (!token || !reviewTarget) return;
    // Stars only, text only, or both — a section with neither is skipped.
    const toSend = missingTargets(reviewTarget).filter((t) => drafts[t].rating > 0 || drafts[t].comment.trim() !== "");
    if (toSend.length === 0) {
      setSheetError("برای ثبت نظر، امتیاز بدهید یا چند کلمه بنویسید");
      return;
    }
    setReviewing(true);
    setSheetError(null);
    try {
      for (const target of toSend) {
        const { rating, comment } = drafts[target];
        await leaveReview(token, reviewTarget.id, { target, rating: rating || undefined, comment: comment.trim() || undefined });
      }
      setReviewTarget(null);
    } catch (err) {
      setSheetError(persianApiError(err, "ثبت نظر انجام نشد"));
    } finally {
      setReviewing(false);
      reload(); // also picks up a review that went through before a later one failed
    }
  }

  function openEdit(booking: CustomerBooking, review: BookingReview) {
    setEditing({ booking, review });
    setEditDraft({ rating: review.rating ?? 0, comment: review.comment ?? "" });
    setConfirmDelete(false);
    setEditError(null);
  }

  const editDirty =
    editing !== null &&
    ((editDraft.rating || null) !== editing.review.rating || (editDraft.comment.trim() || null) !== editing.review.comment);

  async function saveEdit() {
    if (!token || !editing) return;
    if (editDraft.rating === 0 && editDraft.comment.trim() === "") {
      setEditError("امتیاز بدهید یا چند کلمه بنویسید؛ برای پاک کردن کامل، «حذف نظر» را بزنید");
      return;
    }
    setEditBusy("save");
    setEditError(null);
    try {
      await updateReview(token, editing.review.id, { rating: editDraft.rating || null, comment: editDraft.comment.trim() || null });
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(persianApiError(err, "ذخیره تغییرات انجام نشد"));
    } finally {
      setEditBusy(null);
    }
  }

  async function removeReview() {
    if (!token || !editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setEditBusy("delete");
    setEditError(null);
    try {
      await deleteReview(token, editing.review.id);
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(persianApiError(err, "حذف نظر انجام نشد"));
    } finally {
      setEditBusy(null);
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
            const canReview = b.status === "COMPLETED" && missingTargets(b).length > 0;
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
                      {b.services.map((s) => s.service.name).join("، ")}
                      {b.salon.kind !== "INDEPENDENT" && (
                        <>
                          <Sep />
                          {b.stylist.displayName}
                        </>
                      )}
                    </p>
                    {bookingPlace(b) && <p className="mt-0.5 text-[12px] leading-5 text-app-muted">{bookingPlace(b)}</p>}
                  </div>
                  <StatusChip status={b.status} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-app-card-2 px-3.5 py-2.5 text-sm">
                  <span className="font-bold text-app-ink">
                    {relativeDayLabel(wall.dateKey)}<Sep />ساعت {formatMinutesAsClock(wall.minuteOfDay)}
                  </span>
                  <span className="text-app-muted">{formatToman(b.priceToman)}</span>
                </div>

                {b.reviews.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {REVIEW_TARGETS.flatMap((t) => b.reviews.filter((r) => r.target === t)).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openEdit(b, r)}
                        aria-label={`ویرایش نظر درباره ${r.target === "SALON" ? "سالن" : b.stylist.displayName}`}
                        className="block w-full rounded-2xl border border-app-line px-3.5 py-2.5 text-start active:bg-app-card-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-app-muted">{r.target === "SALON" ? "سالن" : b.stylist.displayName}</span>
                          {r.rating !== null && <Stars value={r.rating} size={14} emptyClassName="text-app-line" />}
                          <span className={cx("ms-auto rounded-full px-2 py-0.5 text-[11px] font-bold", REVIEW_STATUS[r.status].className)}>
                            {REVIEW_STATUS[r.status].label}
                          </span>
                        </div>
                        {r.comment && <p className="mt-1 line-clamp-2 text-sm text-app-ink">{r.comment}</p>}
                      </button>
                    ))}
                  </div>
                )}

                {(canCancel || canReview || tab === "past") && (
                  <div className="mt-3 flex gap-2">
                    {canReview && (
                      <Button icon={Star} className="h-11 flex-1" onClick={() => openReview(b)}>
                        {b.reviews.length > 0 ? "تکمیل نظر" : "ثبت نظر"}
                      </Button>
                    )}
                    {tab === "past" && (
                      <Link
                        // Opens the booking sheet with the same services and stylist, at the day/time step.
                        href={`/s/${b.salon.slug}?book=1&services=${b.services.map((s) => s.serviceId).join(",")}&stylist=${b.stylistId}`}
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
          <div className="flex flex-col gap-4">
            {missingTargets(reviewTarget).map((target) => {
              const name = target === "SALON" ? reviewTarget.salon.name : reviewTarget.stylist.displayName;
              const draft = drafts[target];
              return (
                <section key={target} className="rounded-3xl border border-app-line bg-app-card p-4">
                  <p className="text-xs font-bold text-app-muted">
                    {target === "STYLIST" || reviewTarget.salon.kind === "INDEPENDENT" ? "آرایشگر" : "سالن"}
                  </p>
                  <p className="mb-3 font-black text-app-ink">{name}</p>
                  <StarRatingInput
                    value={draft.rating}
                    onChange={(rating) => updateDraft(target, { rating })}
                    label={`امتیاز به ${name}`}
                    size={36}
                    disabled={reviewing}
                  />
                  {draft.rating > 0 && (
                    <button
                      type="button"
                      onClick={() => updateDraft(target, { rating: 0 })}
                      disabled={reviewing}
                      className="mx-auto -mt-1 block rounded-full px-3 py-1 text-xs font-bold text-app-muted active:bg-app-card-2"
                    >
                      حذف امتیاز
                    </button>
                  )}
                  <TextArea
                    rows={3}
                    maxLength={COMMENT_MAX}
                    className="mt-2"
                    value={draft.comment}
                    disabled={reviewing}
                    onChange={(e) => updateDraft(target, { comment: e.target.value })}
                    placeholder={target === "SALON" ? "از فضا، برخورد و خدمات سالن بنویسید" : `از کار ${name} بنویسید`}
                    aria-label={`نظر درباره ${name}`}
                  />
                </section>
              );
            })}
            <p className="px-1 text-xs leading-6 text-app-muted">
              می‌توانید فقط امتیاز بدهید، فقط نظر بنویسید یا هر دو؛ هر بخش را هم می‌توانید خالی بگذارید. نظر شما پس از تایید سالن یا آرایشگر در صفحه سالن نمایش داده می‌شود.
            </p>
            {sheetError && <p className="text-sm font-medium text-app-danger">{sheetError}</p>}
          </div>
        )}
      </Sheet>
      <Sheet
        open={editing !== null}
        onClose={() => editBusy === null && setEditing(null)}
        title="ویرایش نظر"
        footer={
          editDirty ? (
            <Button block busy={editBusy === "save"} disabled={editBusy !== null} onClick={saveEdit}>
              ذخیره تغییرات
            </Button>
          ) : undefined
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <section className="rounded-3xl border border-app-line bg-app-card p-4">
              <p className="text-xs font-bold text-app-muted">{editing.review.target === "SALON" ? "سالن" : "آرایشگر"}</p>
              <p className="mb-3 font-black text-app-ink">
                {editing.review.target === "SALON" ? editing.booking.salon.name : editing.booking.stylist.displayName}
              </p>
              <StarRatingInput
                value={editDraft.rating}
                onChange={(rating) => setEditDraft((d) => ({ ...d, rating }))}
                label="امتیاز"
                size={36}
                disabled={editBusy !== null}
              />
              {editDraft.rating > 0 && (
                <button
                  type="button"
                  onClick={() => setEditDraft((d) => ({ ...d, rating: 0 }))}
                  disabled={editBusy !== null}
                  className="mx-auto -mt-1 block rounded-full px-3 py-1 text-xs font-bold text-app-muted active:bg-app-card-2"
                >
                  حذف امتیاز
                </button>
              )}
              <TextArea
                rows={3}
                maxLength={COMMENT_MAX}
                className="mt-2"
                value={editDraft.comment}
                disabled={editBusy !== null}
                onChange={(e) => setEditDraft((d) => ({ ...d, comment: e.target.value }))}
                placeholder="نظرتان را بنویسید"
                aria-label="متن نظر"
              />
            </section>
            <p className="px-1 text-xs leading-6 text-app-muted">
              {editing.review.status === "APPROVED"
                ? "این نظر الان در صفحه سالن نمایش داده می‌شود. اگر ویرایشش کنید، تا تایید دوباره نمایش داده نمی‌شود."
                : "بعد از ذخیره، نظر شما دوباره برای تایید فرستاده می‌شود."}
            </p>
            {editError && <p className="text-sm font-medium text-app-danger">{editError}</p>}
            <Button variant="danger" block icon={Trash2} busy={editBusy === "delete"} disabled={editBusy !== null} onClick={removeReview}>
              {confirmDelete ? "بله، این نظر حذف شود" : "حذف نظر"}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
