"use client";

import { useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import { normalizeDigits, toPersianDigits, splitFullName } from "@/lib/persian";
import { verifyOtp, requestOtp, otpRequestErrorMessage } from "@/lib/api/bookings";
import { SalonApiError } from "@/lib/api/salonApiClient";

const OTP_LENGTH = 5;

export default function StepOtp() {
  const { state, updateState, goNext } = useBooking();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, raw: string) {
    const value = normalizeDigits(raw).replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      void handleVerify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code: string) {
    setError(null);
    setVerifying(true);
    try {
      const { accessToken } = await verifyOtp(state.customerPhone, code, splitFullName(state.customerName));
      updateState({ accessToken });
      goNext();
    } catch (err) {
      setError(err instanceof SalonApiError ? "کد وارد شده صحیح نیست" : "خطایی رخ داد، دوباره تلاش کنید");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await requestOtp(state.customerPhone);
      setResent(true);
    } catch (err) {
      setError(otpRequestErrorMessage(err, "ارسال مجدد کد ممکن نشد، کمی بعد دوباره تلاش کنید"));
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        کد تایید ۵ رقمی به شماره{" "}
        <span dir="ltr" className="font-medium">
          {toPersianDigits(state.customerPhone)}
        </span>{" "}
        ارسال شد.
      </p>

      <div className="flex flex-row-reverse gap-2" dir="ltr">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit ? toPersianDigits(digit) : ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`رقم ${i + 1} کد تایید`}
            className="h-12 w-11 rounded-lg border border-gray-200 text-center text-lg focus:outline-none focus-visible:ring-2 dark:border-gray-800 dark:bg-gray-900"
            style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
          />
        ))}
      </div>

      {verifying && <p className="text-xs text-gray-500">در حال بررسی کد...</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}

      <button type="button" onClick={handleResend} disabled={resent} className="text-xs font-medium underline disabled:no-underline disabled:opacity-50" style={{ color: "var(--salon-brand)" }}>
        {resent ? "کد مجدد ارسال شد" : "ارسال مجدد کد"}
      </button>
    </div>
  );
}
