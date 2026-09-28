"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { FloatingInput, FormError, PasswordInput } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import SocialAuth from "@/components/guest/SocialAuth";
import { rise } from "@/components/guest/motion";

export default function SignInForm() {
  const router = useRouter();
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

    // Fetch session to get role and redirect accordingly
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
  };

  return (
    <AuthCard
      title="خوش برگشتید"
      subtitle="با ایمیل یا شماره موبایل و رمز عبور وارد شوید."
      footer={
        <>
          حساب ندارید؟ <AuthLink href="/signup">ثبت‌نام کنید</AuthLink>
        </>
      }
    >
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

      <SocialAuth style={rise(6)} />
    </AuthCard>
  );
}
