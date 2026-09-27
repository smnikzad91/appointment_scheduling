"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

function PasswordStrength({ password }: { password: string }) {
  const score =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;

  const labels = ["", "ضعیف", "متوسط", "خوب", "عالی"];
  const colors = ["", "bg-error-400", "bg-warning-400", "bg-success-400", "bg-brand-500"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-gray-200 dark:bg-gray-700"}`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs ${score <= 1 ? "text-error-500" : score === 2 ? "text-warning-500" : score === 3 ? "text-success-500" : "text-brand-500"}`}>
        قدرت رمز: {labels[score]}
      </p>
    </div>
  );
}

export default function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const IRANIAN_MOBILE = /^09[0-9]{9}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!IRANIAN_MOBILE.test(phone)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)");
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
      setError(data.error || "خطا در ثبت‌نام");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      router.push("/signin");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            ایجاد حساب رایگان
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            اطلاعات خود را وارد کنید و همین الان شروع کنید.
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <div
              className="grid grid-cols-2 gap-4"
              style={{ animation: "fade-in-up 0.5s ease 0.2s both" }}
            >
              <div>
                <Label>نام <span className="text-error-500">*</span></Label>
                <Input type="text" placeholder="نام" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>نام خانوادگی <span className="text-error-500">*</span></Label>
                <Input type="text" placeholder="نام خانوادگی" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div style={{ animation: "fade-in-up 0.5s ease 0.25s both" }}>
              <Label>ایمیل <span className="text-error-500">*</span></Label>
              <Input type="email" placeholder="example@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div style={{ animation: "fade-in-up 0.5s ease 0.27s both" }}>
              <Label>شماره موبایل <span className="text-error-500">*</span></Label>
              <Input
                type="tel"
                dir="ltr"
                placeholder="09121234567"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}>
              <Label>رمز عبور <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input
                  placeholder="حداقل ۸ کاراکتر"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              <PasswordStrength password={password} />
            </div>

            <div
              className="flex items-start gap-3"
              style={{ animation: "fade-in-up 0.5s ease 0.35s both" }}
            >
              <Checkbox checked={agreed} onChange={setAgreed} />
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                با ایجاد حساب، با{" "}
                <Link href="#" className="font-medium text-gray-700 hover:text-brand-500 dark:text-white/80">شرایط استفاده</Link>
                {" "}و{" "}
                <Link href="#" className="font-medium text-gray-700 hover:text-brand-500 dark:text-white/80">سیاست حریم خصوصی</Link>
                {" "}Assist Me موافقت می‌کنید.
              </p>
            </div>

            <button
              type="submit"
              disabled={!agreed || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ animation: "fade-in-up 0.5s ease 0.4s both" }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  در حال ثبت‌نام...
                </>
              ) : "ایجاد حساب رایگان"}
            </button>
          </div>
        </form>

        <p
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
          style={{ animation: "fade-in-up 0.5s ease 0.45s both" }}
        >
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href="/signin" className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}
