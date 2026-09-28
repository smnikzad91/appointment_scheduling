"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { FloatingInput, FormError, PasswordInput } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import SocialAuth from "@/components/guest/SocialAuth";
import { rise } from "@/components/guest/motion";
import { requestOtp } from "@/lib/api/bookings";
import { persianApiError } from "@/lib/api/errorMessages";
import { isValidIranianMobile, normalizeDigits, toPersianDigits } from "@/lib/persian";
import { formatCountdown, useResendCountdown } from "@/hooks/useResendCountdown";
import { useWebOtp } from "@/lib/useWebOtp";

const OTP_LENGTH = 5;

/** After signing in, each role goes to its own panel. */
async function goToPanel(router: ReturnType<typeof useRouter>) {
  const res = await fetch("/api/auth/session");
  const session = await res.json();
  const role = session?.user?.role;

  // A customer sent here from a salon page or search (e.g. to save a salon) goes back there.
  // Same-site paths only, so the parameter can't redirect anywhere else.
  const back = new URLSearchParams(window.location.search).get("callbackUrl");
  const safeBack = back && /^\/(?![\/\\])/.test(back) ? back : null; // "/x", never "//x" or "/\\x"
  router.push(
    role === "PLATFORM_ADMIN" ? "/admin" : role === "SALON_OWNER" ? "/salon" : role === "STYLIST" ? "/stylist" : safeBack ?? "/dashboard",
  );
  router.refresh();
}

export default function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("ایمیل/شماره موبایل یا رمز عبور اشتباه است");
      setLoading(false);
      return;
    }

    await goToPanel(router);
  };

  return (
    <AuthCard
      title="خوش برگشتید"
      subtitle={mode === "otp" ? "شماره موبایلتان را وارد کنید تا کد ورود برایتان پیامک شود." : "با ایمیل یا شماره موبایل و رمز عبور وارد شوید."}
      footer={
        <>
          حساب ندارید؟ <AuthLink href="/signup">ثبت‌نام کنید</AuthLink>
        </>
      }
    >
      <div role="tablist" className="g-rise mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-g-line p-1" style={rise(2)}>
        {(
          [
            ["otp", "ورود با کد پیامکی"],
            ["password", "ورود با رمز عبور"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError("");
            }}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${mode === value ? "bg-g-accent text-white shadow-sm" : "text-g-muted hover:text-g-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "otp" ? (
        <OtpSignIn onSignedIn={() => goToPanel(router)} onUsePassword={() => setMode("password")} />
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError>{error}</FormError>

        <FloatingInput
          className="g-rise"
          style={rise(3)}
          label="ایمیل یا شماره موبایل"
          hint="09121234567"
          type="text"
          dir="ltr"
          inputMode="email"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <div className="g-rise" style={rise(4)}>
          <PasswordInput
            label="رمز عبور"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Link href="/reset-password" className="text-[13px] text-g-muted transition hover:text-g-accent">
              رمز را فراموش کرده‌اید؟
            </Link>
          </div>
        </div>

        <GradientButton type="submit" loading={loading} loadingLabel="در حال ورود…" className="g-rise mt-1" style={rise(5)}>
          ورود
        </GradientButton>
      </form>
      )}

      <SocialAuth style={rise(6)} />
    </AuthCard>
  );
}

/** Phone → SMS code → signed in (NextAuth "otp" provider), for every role. */
function OtpSignIn({ onSignedIn, onUsePassword }: { onSignedIn: () => Promise<void>; onUsePassword: () => void }) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<{ phone: string; devCode?: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeDigits(phone.trim());
    if (!isValidIranianMobile(normalized)) return setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
    setError("");
    setLoading(true);
    try {
      const { devCode } = await requestOtp(normalized);
      setSent({ phone: normalized, devCode });
    } catch (err) {
      setError(persianApiError(err, "ارسال کد ورود ممکن نشد، دوباره تلاش کنید"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <OtpCodeForm
        phone={sent.phone}
        devCode={sent.devCode}
        onSignedIn={onSignedIn}
        onUsePassword={onUsePassword}
        onChangePhone={() => {
          setSent(null);
          setError("");
        }}
      />
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      <FormError>{error}</FormError>
      <FloatingInput
        className="g-rise"
        style={rise(3)}
        label="شماره موبایل"
        hint="09121234567"
        type="tel"
        dir="ltr"
        inputMode="numeric"
        autoComplete="tel"
        required
        value={phone}
        onChange={(e) => setPhone(normalizeDigits(e.target.value))}
      />
      <GradientButton type="submit" loading={loading} loadingLabel="در حال ارسال کد…" className="g-rise mt-1" style={rise(4)}>
        دریافت کد ورود
      </GradientButton>
    </form>
  );
}

/** Mounted once the code is sent, so the resend countdown starts then. */
function OtpCodeForm({
  phone,
  devCode,
  onSignedIn,
  onUsePassword,
  onChangePhone,
}: {
  phone: string;
  devCode?: string;
  onSignedIn: () => Promise<void>;
  onUsePassword: () => void;
  onChangePhone: () => void;
}) {
  // No SMS provider yet (the api's OTP bypass): it returned the code, so fill it in and sign in.
  const [code, setCode] = useState(devCode ?? "");
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, restart } = useResendCountdown();

  async function verify(otp: string) {
    setError("");
    setLoading(true);
    const result = await signIn("otp", { phone, code: otp, redirect: false });
    if (result?.error) {
      setError(
        result.code === "no_account" ? (
          <>
            حسابی با این شماره موبایل وجود ندارد. <AuthLink href="/signup">ثبت‌نام کنید</AuthLink>
          </>
        ) : result.code === "staff_password" ? (
          <>
            این شماره متعلق به حساب مدیر یا آرایشگر است.{" "}
            <button type="button" onClick={onUsePassword} className="font-bold underline">
              با رمز عبور وارد شوید
            </button>
          </>
        ) : (
          "کد وارد شده صحیح نیست یا منقضی شده است"
        ),
      );
      setLoading(false);
      return;
    }
    await onSignedIn();
  }

  useEffect(() => {
    if (devCode?.length !== OTP_LENGTH) return;
    const t = setTimeout(() => void verify(devCode), 400);
    return () => clearTimeout(t);
    // once, on arrival with a code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chrome on Android reads the code from the SMS itself and signs in.
  useWebOtp(!devCode, (otp) => {
    const digits = normalizeDigits(otp).replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH) void verify(digits);
  });

  async function resend() {
    setError("");
    setResending(true);
    try {
      const { devCode: next } = await requestOtp(phone);
      restart();
      setCode(next ?? "");
      if (next?.length === OTP_LENGTH) void verify(next);
    } catch (err) {
      setError(persianApiError(err, "ارسال مجدد کد ممکن نشد، کمی بعد دوباره تلاش کنید"));
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm leading-7 text-g-muted">
        کد {toPersianDigits(OTP_LENGTH)} رقمی به شماره <span dir="ltr">{toPersianDigits(phone)}</span> پیامک شد.
      </p>
      <FormError>{error}</FormError>
      <FloatingInput
        label="کد ورود"
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
      <GradientButton type="submit" loading={loading} loadingLabel="در حال ورود…" disabled={code.length !== OTP_LENGTH}>
        ورود
      </GradientButton>
      <div className="flex items-center justify-between text-[13px]">
        <button type="button" onClick={onChangePhone} className="text-g-muted transition hover:text-g-accent">
          تغییر شماره
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
