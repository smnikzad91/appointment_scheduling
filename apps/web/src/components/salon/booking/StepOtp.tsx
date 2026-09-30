"use client";

import { useEffect, useRef, useState } from "react";
import { useBooking } from "./BookingProvider";
import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { verifyOtp, requestOtp } from "@/lib/api/bookings";
import { SalonApiError } from "@/lib/api/salonApiClient";
import { useWebOtp } from "@/lib/useWebOtp";
import { persianApiError } from "@/lib/api/errorMessages";
import { formatCountdown, useResendCountdown } from "@/hooks/useResendCountdown";

const OTP_LENGTH = 5;

export default function StepOtp() {
  const { state, updateState, goNext } = useBooking();
  // No SMS provider yet: the API returned the code, so show it filled in and verify by itself.
  const [digits, setDigits] = useState<string[]>(() =>
    state.devCode?.length === OTP_LENGTH ? state.devCode.split("") : Array(OTP_LENGTH).fill(""),
  );
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  // The api allows one code per phone per minute.
  const { secondsLeft, restart } = useResendCountdown();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (state.devCode?.length !== OTP_LENGTH) return;
    const t = setTimeout(() => void handleVerify(state.devCode!), 400);
    return () => clearTimeout(t);
    // once, on arrival with a code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chrome on Android reads the code from the SMS itself.
  useWebOtp(!state.devCode, (code) => fillCode(code));

  function fillCode(raw: string) {
    const code = normalizeDigits(raw).replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (code.length !== OTP_LENGTH) return;
    setDigits(code.split(""));
    void handleVerify(code);
  }

  function handleChange(index: number, raw: string) {
    const typed = normalizeDigits(raw).replace(/[^0-9]/g, "");
    // A pasted or autofilled whole code (iOS keyboard suggestion) lands in one box.
    if (typed.length >= OTP_LENGTH) return fillCode(typed);
    const value = typed.slice(-1);
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
      const { accessToken } = await verifyOtp(state.customerPhone, code, { firstName: state.customerFirstName.trim(), lastName: state.customerLastName.trim() });
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
    setResending(true);
    try {
      const { devCode } = await requestOtp(state.customerPhone);
      restart();
      if (devCode?.length === OTP_LENGTH) {
        setDigits(devCode.split(""));
        void handleVerify(devCode);
      } else {
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(persianApiError(err, "ارسال مجدد کد ممکن نشد، کمی بعد دوباره تلاش کنید"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-g-muted">
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
            autoComplete={i === 0 ? "one-time-code" : "off"}
            data-no-draft=""
            value={digit ? toPersianDigits(digit) : ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`رقم ${i + 1} کد تایید`}
            className="h-12 w-11 rounded-lg border border-g-line text-center text-lg focus:outline-none focus-visible:ring-2"
            style={{ "--tw-ring-color": "var(--salon-brand)" } as React.CSSProperties}
          />
        ))}
      </div>

      {verifying && <p className="text-xs text-g-muted">در حال بررسی کد...</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}

      {secondsLeft > 0 ? (
        <p className="text-xs text-g-muted">
          پیامک ممکن است چند ثانیه طول بکشد. ارسال مجدد کد تا <span dir="ltr">{formatCountdown(secondsLeft)}</span> دیگر
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-xs font-medium underline disabled:no-underline disabled:opacity-50"
          style={{ color: "var(--salon-brand-ink)" }}
        >
          {resending ? "در حال ارسال..." : "کد را دریافت نکردید؟ ارسال مجدد"}
        </button>
      )}
    </div>
  );
}
