"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { completePasswordSetup, getPasswordSetup, type PasswordSetupInfo } from "@/lib/api/passwordSetup";
import { persianApiError } from "@/lib/api/errorMessages";
import { toPersianDigits } from "@/lib/persian";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { FormError, PasswordInput, PasswordStrength } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import { rise } from "@/components/guest/motion";

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

  if (linkError) {
    return (
      <AuthCard title="لینک معتبر نیست" subtitle={linkError}>
        <p className="g-rise text-sm text-g-muted" style={rise(3)}>
          اگر قبلاً رمز گذاشته‌اید، <AuthLink href="/signin">وارد شوید</AuthLink>؛ وگرنه از مدیر سالن بخواهید لینک تازه‌ای برایتان بفرستد.
        </p>
      </AuthCard>
    );
  }

  if (!info) {
    return (
      <AuthCard title="در حال بررسی لینک…">
        <div className="space-y-3" aria-busy>
          <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={info.firstTime ? `${info.firstName} عزیز، خوش آمدید` : "انتخاب رمز عبور تازه"}
      subtitle={
        <>
          {info.firstTime
            ? `برای ورود به پنل آرایشگر${info.salonName ? ` «${info.salonName}»` : ""}، رمز عبور خود را انتخاب کنید.`
            : "رمز عبور جدید خود را انتخاب کنید؛ رمز قبلی دیگر کار نمی‌کند."}
          {info.phone && (
            <>
              {" "}
              از این پس با شماره <span dir="ltr">{toPersianDigits(info.phone)}</span> و همین رمز وارد می‌شوید.
            </>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError>{error}</FormError>

        {/* Lets the phone's password manager save the new password against this number. */}
        <input type="text" name="username" autoComplete="username" value={info.phone ?? ""} readOnly hidden />

        <div className="g-rise" style={rise(3)}>
          <PasswordInput
            label="رمز عبور"
            hint={`حداقل ${toPersianDigits(MIN_LENGTH)} کاراکتر`}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          className="g-rise"
          style={rise(4)}
          label="تکرار رمز عبور"
          autoComplete="new-password"
          required
          aria-invalid={confirm.length >= password.length && confirm !== password}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <GradientButton type="submit" loading={loading} loadingLabel="در حال ثبت…" className="g-rise mt-1" style={rise(5)}>
          ثبت رمز و ورود
        </GradientButton>
      </form>
    </AuthCard>
  );
}
