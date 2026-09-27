"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { completePasswordSetup, getPasswordSetup, type PasswordSetupInfo } from "@/lib/api/passwordSetup";
import { persianApiError } from "@/lib/api/errorMessages";
import { toPersianDigits } from "@/lib/persian";

const MIN_LENGTH = 8;

/**
 * Where an invited stylist lands from the salon owner's one-time link: choose a password, then
 * get signed straight into the stylist panel. The link dies once used (or when the owner makes a
 * new one), so a used or expired link just explains how to get a fresh one.
 */
export default function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<PasswordSetupInfo | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPasswordSetup(token)
      .then(setInfo)
      .catch((err) => setLinkError(persianApiError(err, "بررسی لینک انجام نشد؛ اتصال اینترنت را بررسی کنید")));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) {
      setError(`رمز عبور باید حداقل ${toPersianDigits(MIN_LENGTH)} کاراکتر باشد`);
      return;
    }
    if (password !== confirm) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      return;
    }
    setLoading(true);
    try {
      const { phone } = await completePasswordSetup(token, password);
      const result = phone ? await signIn("credentials", { identifier: phone, password, redirect: false }) : null;
      if (!result || result.error) {
        // The password is set; only the automatic sign-in failed.
        router.push("/signin");
        return;
      }
      router.push("/stylist");
      router.refresh();
    } catch (err) {
      setError(persianApiError(err, "ثبت رمز عبور انجام نشد"));
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 py-10">
        {linkError ? (
          <div style={{ animation: "fade-in-up 0.5s ease both" }}>
            <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">لینک معتبر نیست</h1>
            <p className="mb-6 text-sm leading-7 text-gray-500 dark:text-gray-400">{linkError}</p>
            <Link href="/signin" className="text-sm font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
              اگر قبلاً رمز گذاشته‌اید، وارد شوید
            </Link>
          </div>
        ) : !info ? (
          <div className="space-y-3" aria-busy>
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : (
          <>
            <div className="mb-7" style={{ animation: "fade-in-up 0.5s ease 0.05s both" }}>
              <h1 className="mb-1.5 text-2xl font-bold text-gray-800 dark:text-white/90">
                {info.firstTime ? `${info.firstName} عزیز، خوش آمدید` : "انتخاب رمز عبور تازه"}
              </h1>
              <p className="text-sm leading-7 text-gray-500 dark:text-gray-400">
                {info.firstTime
                  ? `برای ورود به پنل آرایشگر${info.salonName ? ` «${info.salonName}»` : ""}، رمز عبور خود را انتخاب کنید.`
                  : "رمز عبور جدید خود را انتخاب کنید؛ رمز قبلی دیگر کار نمی‌کند."}
                {info.phone && (
                  <>
                    {" "}
                    از این پس با شماره <span dir="ltr">{toPersianDigits(info.phone)}</span> و همین رمز وارد می‌شوید.
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                    {error}
                  </div>
                )}

                {/* Lets the phone's password manager save the new password against this number. */}
                <input type="text" name="username" autoComplete="username" value={info.phone ?? ""} readOnly hidden />

                <div style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}>
                  <Label>رمز عبور <span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={`حداقل ${toPersianDigits(MIN_LENGTH)} کاراکتر`}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeIcon className="fill-current" /> : <EyeCloseIcon className="fill-current" />}
                    </button>
                  </div>
                </div>

                <div style={{ animation: "fade-in-up 0.5s ease 0.25s both" }}>
                  <Label>تکرار رمز عبور <span className="text-error-500">*</span></Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="رمز عبور را دوباره وارد کنید"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}
                >
                  {loading ? "در حال ثبت..." : "ثبت رمز و ورود"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
