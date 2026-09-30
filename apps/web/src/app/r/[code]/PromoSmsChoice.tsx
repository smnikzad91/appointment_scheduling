"use client";

import { useState } from "react";
import { salonApiFetch } from "@/lib/api/salonApiClient";
import { toastError } from "@/lib/toastError";

/** Stop (or resume) the "time to book again" texts, for the customer this link was sent to. */
export default function PromoSmsChoice({ code, initialOptedOut }: { code: string; initialOptedOut: boolean }) {
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [busy, setBusy] = useState(false);

  async function set(optOut: boolean) {
    setBusy(true);
    try {
      await salonApiFetch(`/rebook/${encodeURIComponent(code)}/promo-sms`, { method: "POST", body: JSON.stringify({ optOut }) });
      setOptedOut(optOut);
    } catch {
      toastError("انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-sm leading-7 text-g-muted">
      {optedOut ? (
        <>
          <p className="font-bold text-g-ink">دیگر پیامک «وقت نوبت بعدی» برایتان ارسال نمی‌شود.</p>
          <p>کد ورود، یادآوری نوبت‌ها و تغییرات رزرو همچنان ارسال می‌شوند.</p>
          <button type="button" disabled={busy} onClick={() => set(false)} className="mt-1 font-medium underline disabled:opacity-50">
            دوباره دریافت کنم
          </button>
        </>
      ) : (
        <button type="button" disabled={busy} onClick={() => set(true)} className="font-medium underline disabled:opacity-50">
          دیگر پیامک یادآوری نوبت بعدی نفرستید
        </button>
      )}
    </div>
  );
}
