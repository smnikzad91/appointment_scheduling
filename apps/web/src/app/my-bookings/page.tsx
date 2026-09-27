"use client";

import { useEffect, useState } from "react";
import { LogOut, Star } from "lucide-react";
import { requestOtp, verifyOtp } from "@/lib/api/bookings";
import { getMyBookings, cancelBooking, leaveReview, type CustomerBooking } from "@/lib/api/customerBookings";
import { loadCustomerSession, saveCustomerSession, clearCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeDigits, isValidIranianMobile, toPersianDigits, formatToman, splitFullName } from "@/lib/persian";
import { formatSalonDateTime } from "@/lib/salonTime";
import { SalonApiError } from "@/lib/api/salonApiClient";

const STATUS_LABEL: Record<CustomerBooking["status"], string> = {
  PENDING: "در انتظار تایید",
  CONFIRMED: "تایید شده",
  CANCELLED: "لغو شده",
  COMPLETED: "انجام شده",
  NO_SHOW: "عدم حضور",
};

const STATUS_COLOR: Record<CustomerBooking["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  NO_SHOW: "bg-rose-100 text-rose-700",
};

export default function MyBookingsPage() {
  const [session, setSession] = useState<CustomerSession | null | undefined>(undefined);
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // One-time localStorage read on mount — must stay in an effect (not a lazy useState
    // initializer) so the server-rendered pass and the client's first hydration pass both
    // start from `undefined`, avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(loadCustomerSession());
  }, []);

  function reload(token: string) {
    getMyBookings(token)
      .then(setBookings)
      .catch((err) => {
        if (err instanceof SalonApiError && err.status === 401) {
          clearCustomerSession();
          setSession(null);
        } else {
          setError("خطا در دریافت نوبت‌ها");
        }
      });
  }

  useEffect(() => {
    if (session) reload(session.token);
  }, [session]);

  function handleLoggedIn(newSession: CustomerSession) {
    saveCustomerSession(newSession);
    setSession(newSession);
  }

  function handleLogout() {
    clearCustomerSession();
    setSession(null);
    setBookings(null);
  }

  async function handleCancel(id: string) {
    if (!session) return;
    await cancelBooking(session.token, id);
    reload(session.token);
  }

  if (session === undefined) return null; // avoid a flash of the login form before localStorage is read

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">نوبت‌های من</h1>
        {session && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            خروج
          </button>
        )}
      </div>

      {!session ? (
        <LoginForm onLoggedIn={handleLoggedIn} />
      ) : (
        <>
          {error && <p className="mb-4 text-sm text-rose-500">{error}</p>}
          {!bookings ? (
            <p className="text-sm text-gray-500">در حال بارگذاری...</p>
          ) : bookings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">
              هنوز نوبتی ثبت نکرده‌اید.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} token={session.token} onCancel={() => handleCancel(b.id)} onReviewed={() => reload(session.token)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (session: CustomerSession) => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeDigits(phone);
    if (!isValidIranianMobile(normalized)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }
    if (!name.trim()) {
      setError("لطفاً نام خود را وارد کنید");
      return;
    }
    setError(null);
    setLoading(true);
    setPhone(normalized);
    await requestOtp(normalized);
    setLoading(false);
    setStep("otp");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await verifyOtp(phone, code, splitFullName(name));
      onLoggedIn({ token: accessToken, firstName: user.firstName });
    } catch {
      setError("کد وارد شده صحیح نیست");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        برای مشاهده نوبت‌های خود، شماره موبایلتان را وارد کنید.
      </p>

      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام و نام خانوادگی"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(normalizeDigits(e.target.value))}
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-end text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "در حال ارسال..." : "دریافت کد تایید"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            کد تایید به شماره <span dir="ltr">{toPersianDigits(phone)}</span> ارسال شد.
          </p>
          <input
            dir="ltr"
            value={code}
            onChange={(e) => setCode(normalizeDigits(e.target.value))}
            placeholder="کد ۵ رقمی"
            maxLength={5}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg tracking-widest dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "در حال بررسی..." : "تایید و ورود"}
          </button>
        </form>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  token,
  onCancel,
  onReviewed,
}: {
  booking: CustomerBooking;
  token: string;
  onCancel: () => void;
  onReviewed: () => void;
}) {
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canReview = booking.status === "COMPLETED" && !booking.review;

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{booking.salon.name}</p>
          <p className="text-sm text-gray-500">{booking.services.map((s) => s.service.name).join("، ")}</p>
          <p className="text-xs text-gray-400">{booking.stylist.displayName}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${STATUS_COLOR[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {formatSalonDateTime(booking.startAt)} — {formatToman(booking.priceToman)}
        </span>
        {canCancel && (
          <button type="button" onClick={onCancel} className="text-xs font-medium text-rose-600 hover:underline">
            لغو نوبت
          </button>
        )}
      </div>

      {booking.review && (
        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= booking.review!.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />
          ))}
          {booking.review.comment && <span className="text-gray-500">{booking.review.comment}</span>}
        </div>
      )}

      {canReview && <ReviewForm appointmentId={booking.id} token={token} onDone={onReviewed} />}
    </div>
  );
}

function ReviewForm({ appointmentId, token, onDone }: { appointmentId: string; token: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leaveReview(token, appointmentId, rating, comment || undefined);
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} ستاره`}>
            <Star className={`h-5 w-5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} aria-hidden />
          </button>
        ))}
      </div>
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="نظر شما (اختیاری)"
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? "در حال ثبت..." : "ثبت نظر"}
      </button>
    </form>
  );
}
