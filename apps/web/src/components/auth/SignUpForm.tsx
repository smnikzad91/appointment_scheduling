"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { FloatingInput, GlassCheckbox, PasswordInput, PasswordStrength } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import SocialAuth from "@/components/guest/SocialAuth";
import { rise } from "@/components/guest/motion";
import { toastError } from "@/lib/toastError";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;

export default function SignUpForm() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!IRANIAN_MOBILE.test(phone)) {
      toastError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, phone, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toastError(data.error || "خطا در ثبت‌نام");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration
    const result = await signIn("credentials", { identifier: email, password, redirect: false });
    if (result?.error) {
      router.push("/signin");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="ساخت حساب رایگان"
      subtitle="نوبت‌های سالن‌ها را آنلاین رزرو و همه را یک‌جا پیگیری کنید."
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟ <AuthLink href="/signin">وارد شوید</AuthLink>
          <span className="mt-2 block">
            صاحب سالن هستید؟ <AuthLink href="/signup-salon">سالن خود را ثبت کنید</AuthLink>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div className="g-rise grid grid-cols-2 gap-3" style={rise(3)}>
          <FloatingInput label="نام" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <FloatingInput label="نام خانوادگی" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <FloatingInput
          className="g-rise"
          style={rise(4)}
          label="ایمیل"
          hint="example@email.com"
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FloatingInput
          className="g-rise"
          style={rise(5)}
          label="شماره موبایل"
          hint="09121234567"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="g-rise" style={rise(6)}>
          <PasswordInput
            label="رمز عبور"
            hint="حداقل ۸ کاراکتر"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="g-rise" style={rise(7)}>
          <GlassCheckbox checked={agreed} onChange={setAgreed}>
            با <AuthLink href="/terms">شرایط استفاده</AuthLink> و <AuthLink href="/privacy">حریم خصوصی</AuthLink> نوبتت موافقم.
          </GlassCheckbox>
        </div>

        <GradientButton type="submit" disabled={!agreed} loading={loading} loadingLabel="در حال ثبت‌نام…" className="g-rise mt-1" style={rise(8)}>
          ساخت حساب
        </GradientButton>
      </form>

      <SocialAuth style={rise(8.5)} />
    </AuthCard>
  );
}
