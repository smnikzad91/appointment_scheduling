"use client";

import { useState } from "react";
import { useBooking } from "./BookingProvider";
import { normalizeDigits, isValidIranianMobile } from "@/lib/persian";
import { persianApiError } from "@/lib/api/errorMessages";
import { requestOtp } from "@/lib/api/bookings";

export default function StepContact() {
  const { state, updateState, goNext } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizeDigits(state.customerPhone);

    if (!state.customerName.trim()) {
      setError("لطفاً نام خود را وارد کنید");
      return;
    }
    if (!isValidIranianMobile(phone)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }

    setError(null);
    setSubmitting(true);
    updateState({ customerPhone: phone });
    try {
      const { devCode } = await requestOtp(phone);
      updateState({ devCode: devCode ?? null });
      goNext();
    } catch (err) {
      setError(persianApiError(err, "ارسال کد تایید ممکن نشد، دوباره تلاش کنید"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        نام و نام خانوادگی
        <input
          type="text"
          value={state.customerName}
          onChange={(e) => updateState({ customerName: e.target.value })}
          className="rounded-lg border border-g-line px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
          style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
          placeholder="مثلاً سارا احمدی"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        شماره موبایل
        <input
          type="tel"
          inputMode="numeric"
          dir="ltr"
          value={state.customerPhone}
          onChange={(e) => updateState({ customerPhone: normalizeDigits(e.target.value) })}
          className="rounded-lg border border-g-line px-3 py-2.5 text-end text-sm focus:outline-none focus-visible:ring-2"
          style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          maxLength={11}
        />
      </label>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full py-3 text-sm font-bold text-white transition disabled:opacity-60"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        {submitting ? "در حال ارسال کد..." : "ارسال کد تایید"}
      </button>
    </form>
  );
}
