"use client";

import { useState } from "react";
import { FloatingInput } from "./fields";
import GradientButton from "./GradientButton";
import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { formatCountdown, useResendCountdown } from "@/hooks/useResendCountdown";
import { useWebOtp } from "@/lib/useWebOtp";
import { persianApiError } from "@/lib/api/errorMessages";
import { toastError } from "@/lib/toastError";

const OTP_LENGTH = 5;

/**
 * "Confirm your phone": the SMS code step shown in place of a sign-up / set-password form once the
 * code was sent (the form's own state stays in its parent). `onSubmit` gets the code and does the
 * real work (create the account, set the password); `onResend` asks for a new code.
 */
export default function PhoneCodeStep({
  phone,
  devCode,
  submitLabel,
  loadingLabel,
  onSubmit,
  onResend,
  onBack,
  backLabel = "تغییر شماره",
}: {
  phone: string;
  /** Under the API's dev bypass the code comes back in the response: shown filled in. */
  devCode?: string | null;
  submitLabel: string;
  loadingLabel: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<{ devCode?: string }>;
  onBack: () => void;
  backLabel?: string;
}) {
  const [code, setCode] = useState(devCode ?? "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, restart } = useResendCountdown();

  async function submit(value: string) {
    if (value.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    try {
      await onSubmit(value);
    } finally {
      setLoading(false);
    }
  }

  // Chrome on Android reads the code from the SMS by itself.
  useWebOtp(!devCode, (otp) => {
    const digits = normalizeDigits(otp).replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH) void submit(digits);
  });

  async function resend() {
    setResending(true);
    try {
      const { devCode: next } = await onResend();
      restart();
      setCode(next ?? "");
    } catch (err) {
      toastError(persianApiError(err, "ارسال مجدد کد ممکن نشد، کمی بعد دوباره تلاش کنید"));
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(code);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm leading-7 text-g-muted">
        برای تایید شماره موبایل، کد {toPersianDigits(OTP_LENGTH)} رقمی که به <span dir="ltr">{toPersianDigits(phone)}</span> پیامک شد را وارد کنید.
      </p>
      <FloatingInput
        label="کد تایید"
        hint="-----"
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        value={code}
        onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, OTP_LENGTH))}
      />
      <GradientButton type="submit" loading={loading} loadingLabel={loadingLabel} disabled={code.length !== OTP_LENGTH}>
        {submitLabel}
      </GradientButton>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" onClick={onBack} className="text-g-muted transition hover:text-g-accent">
          {backLabel}
        </button>
        {secondsLeft > 0 ? (
          <span className="text-g-muted">
            ارسال مجدد تا <span dir="ltr">{formatCountdown(secondsLeft)}</span>
          </span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="font-bold text-g-accent disabled:opacity-50">
            {resending ? "در حال ارسال…" : "ارسال مجدد کد"}
          </button>
        )}
      </div>
    </form>
  );
}
