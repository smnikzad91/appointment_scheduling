"use client";

import { useState } from "react";
import { useBooking } from "./BookingProvider";
import { normalizeDigits, isValidIranianMobile } from "@/lib/persian";
import { persianApiError } from "@/lib/api/errorMessages";
import { requestOtp } from "@/lib/api/bookings";
import { toastError } from "@/lib/toastError";

export default function StepContact() {
  const { state, updateState, goNext } = useBooking();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizeDigits(state.customerPhone);

    if (!state.customerFirstName.trim() || !state.customerLastName.trim()) {
      toastError("لطفاً نام و نام خانوادگی خود را وارد کنید");
      return;
    }
    if (!isValidIranianMobile(phone)) {
      toastError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }

    setSubmitting(true);
    updateState({ customerPhone: phone });
    try {
      const { devCode } = await requestOtp(phone);
      updateState({ devCode: devCode ?? null });
      goNext();
    } catch (err) {
      toastError(persianApiError(err, "ارسال کد تایید ممکن نشد، دوباره تلاش کنید"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          نام
          <input
            type="text"
            autoComplete="given-name"
            value={state.customerFirstName}
            onChange={(e) => updateState({ customerFirstName: e.target.value })}
            className="w-full rounded-lg border border-g-line px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
            style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
            placeholder="مثلاً سارا"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          نام خانوادگی
          <input
            type="text"
            autoComplete="family-name"
            value={state.customerLastName}
            onChange={(e) => updateState({ customerLastName: e.target.value })}
            className="w-full rounded-lg border border-g-line px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
            style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
            placeholder="مثلاً احمدی"
          />
        </label>
      </div>

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
