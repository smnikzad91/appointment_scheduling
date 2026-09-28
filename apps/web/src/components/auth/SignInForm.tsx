"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { otpRequestErrorMessage, requestOtp } from "@/lib/api/bookings";
import { isValidIranianMobile, normalizeDigits, toPersianDigits } from "@/lib/persian";
import { formatCountdown, useResendCountdown } from "@/hooks/useResendCountdown";

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="flex flex-col flex-1 w-full">
      {/* back link */}
      <div
        className="w-full max-w-md sm:pt-10 mx-auto mb-5 px-6 sm:px-0"
        style={{ animation: "fade-in-up 0.4s ease both" }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-all hover:text-brand-500 hover:-translate-x-0.5 dark:text-gray-500"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          بازگشت به سایت
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 pb-10">

        {/* header */}
        <div className="mb-7" style={{ animation: "fade-in-up 0.5s ease 0.05s both" }}>
          <h1 className="mb-1.5 text-2xl font-bold text-gray-800 dark:text-white/90">
            ورود به حساب
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === "otp"
              ? "شماره موبایل خود را وارد کنید تا کد ورود برایتان پیامک شود."
              : "ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید."}
          </p>
        </div>

        {/* sign-in method */}
        <div
          role="tablist"
          className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
          style={{ animation: "fade-in-up 0.5s ease 0.1s both" }}
        >
          {([
            ["otp", "ورود با کد پیامکی"],
            ["password", "ورود با رمز عبور"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setError("");
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === value
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white/90"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "otp" ? (
          <OtpSignIn onSignedIn={() => goToPanel(router)} />
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <div style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}>
              <Label>ایمیل یا شماره موبایل <span className="text-error-500">*</span></Label>
              <Input
                placeholder="example@email.com یا 09121234567"
                type="text"
                dir="ltr"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div style={{ animation: "fade-in-up 0.5s ease 0.25s both" }}>
              <Label>رمز عبور <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="رمز عبور خود را وارد کنید"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword
                    ? <EyeIcon className="fill-current" />
                    : <EyeCloseIcon className="fill-current" />}
                </button>
              </div>
            </div>

            <div
              className="flex items-center justify-between"
              style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}
            >
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span className="text-sm text-gray-600 dark:text-gray-400">مرا به خاطر بسپار</span>
              </label>
              <Link href="/reset-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors">
                فراموشی رمز
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ animation: "fade-in-up 0.5s ease 0.35s both" }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  در حال ورود...
                </>
              ) : "ورود"}
            </button>
          </div>
        </form>
        )}

        <p
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
          style={{ animation: "fade-in-up 0.5s ease 0.4s both" }}
        >
          حساب ندارید؟{" "}
          <Link href="/signup" className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Phone → SMS code → signed in (NextAuth "otp" provider). Works for every role. */
function OtpSignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeDigits(phone.trim());
    if (!isValidIranianMobile(normalized)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestOtp(normalized);
      setSentTo(normalized);
    } catch (err) {
      setError(otpRequestErrorMessage(err, "ارسال کد ورود ممکن نشد، دوباره تلاش کنید"));
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <OtpCodeForm
        phone={sentTo}
        onSignedIn={onSignedIn}
        onChangePhone={() => {
          setSentTo(null);
          setError("");
        }}
      />
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-5">
      {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">{error}</div>}
      <div>
        <Label>
          شماره موبایل <span className="text-error-500">*</span>
        </Label>
        <Input
          placeholder="09121234567"
          type="tel"
          inputMode="numeric"
          dir="ltr"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(normalizeDigits(e.target.value))}
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="در حال ارسال کد...">
        دریافت کد ورود
      </SubmitButton>
    </form>
  );
}

/** Mounted once the code is sent, so the resend countdown starts then. */
function OtpCodeForm({ phone, onSignedIn, onChangePhone }: { phone: string; onSignedIn: () => Promise<void>; onChangePhone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, restart } = useResendCountdown();

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("otp", { phone, code, redirect: false });
    if (result?.error) {
      setError(
        result.code === "no_account" ? (
          <>
            حسابی با این شماره موبایل وجود ندارد.{" "}
            <Link href="/signup" className="font-semibold underline">
              ثبت‌نام کنید
            </Link>
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

  async function resend() {
    setError("");
    setResending(true);
    try {
      await requestOtp(phone);
      setCode("");
      restart();
    } catch (err) {
      setError(otpRequestErrorMessage(err, "ارسال مجدد کد ممکن نشد، کمی بعد دوباره تلاش کنید"));
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        کد {toPersianDigits(OTP_LENGTH)} رقمی به شماره <span dir="ltr">{toPersianDigits(phone)}</span> پیامک شد.
      </p>
      {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">{error}</div>}
      <div>
        <Label>
          کد ورود <span className="text-error-500">*</span>
        </Label>
        <Input
          placeholder="-----"
          type="text"
          inputMode="numeric"
          dir="ltr"
          autoComplete="one-time-code"
          className="text-center text-lg tracking-[0.5em]"
          required
          value={code}
          onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, OTP_LENGTH))}
        />
      </div>
      <SubmitButton loading={loading} disabled={code.length !== OTP_LENGTH} loadingLabel="در حال ورود...">
        ورود
      </SubmitButton>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onChangePhone} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          تغییر شماره
        </button>
        {secondsLeft > 0 ? (
          <span className="text-gray-500 dark:text-gray-400">
            ارسال مجدد تا <span dir="ltr">{formatCountdown(secondsLeft)}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-brand-500 hover:text-brand-600 disabled:opacity-50 dark:text-brand-400"
          >
            {resending ? "در حال ارسال..." : "ارسال مجدد کد"}
          </button>
        )}
      </div>
    </form>
  );
}

function SubmitButton({
  loading,
  disabled,
  loadingLabel,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
