"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { placeCenter } from "@appointment-scheduling/iran-locations";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
import LocationPickerLoader from "@/components/salon-dashboard/LocationPickerLoader";
import type { GeoLocation } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { FloatingInput, FloatingTextArea, FormError, PasswordInput, PasswordStrength } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import { rise } from "@/components/guest/motion";


export default function SignUpSalonForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [place, setPlace] = useState({ province: "", city: "" });
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<GeoLocation | null>(null);
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
    if (!place.province || !place.city) {
      setError("استان و شهر سالن را انتخاب کنید");
      return;
    }
    if (!pin) {
      setError("محل سالن را روی نقشه مشخص کنید تا مشتری‌ها بتوانند آن را پیدا کنند");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register-salon-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        password,
        salonName,
        province: place.province,
        city: place.city,
        address,
        latitude: pin.lat,
        longitude: pin.lng,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "خطا در ثبت‌نام");
      setLoading(false);
      return;
    }

    // Auto sign-in after successful registration — NextAuth's credentials provider
    // accepts phone or email as the "email" field (see auth.ts).
    const result = await signIn("credentials", { identifier: phone, password, redirect: false });
    if (result?.error) {
      router.push("/signin");
      return;
    }

    router.push("/salon");
    router.refresh();
  };

  const center = (() => {
    const c = placeCenter(place.province, place.city);
    return c ? { lat: c[0], lng: c[1] } : null;
  })();

  return (
    <AuthCard
      wide
      title="سالن‌تان را آنلاین کنید"
      subtitle="ثبت رایگان؛ چند دقیقه دیگر لینک رزرو اختصاصی سالن آماده است."
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟ <AuthLink href="/signin">وارد شوید</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormError>{error}</FormError>

        <StepTitle n="۱" i={3}>اطلاعات شما</StepTitle>
        <div className="g-rise grid grid-cols-2 gap-3" style={rise(3.5)}>
          <FloatingInput label="نام" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <FloatingInput label="نام خانوادگی" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <FloatingInput
          className="g-rise"
          style={rise(4)}
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
        <div className="g-rise" style={rise(4.5)}>
          <PasswordInput label="رمز عبور" hint="حداقل ۸ کاراکتر" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
        </div>

        <StepTitle n="۲" i={5}>سالن</StepTitle>
        <FloatingInput className="g-rise" style={rise(5.5)} label="نام سالن" hint="مثلاً سالن زیبایی رزا" required value={salonName} onChange={(e) => setSalonName(e.target.value)} />
        <div className="g-rise" style={rise(6)}>
          <ProvinceCitySelect value={place} onChange={setPlace} required selectClassName="g-select" labelClassName="px-1 text-[13px] text-g-muted" />
        </div>
        <FloatingTextArea
          className="g-rise"
          style={rise(6.5)}
          label="آدرس دقیق"
          hint="خیابان، کوچه، پلاک، طبقه"
          rows={2}
          required
          minLength={5}
          maxLength={300}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="g-rise" style={rise(7)}>
          <p className="mb-1.5 px-1 text-[13px] text-g-muted">
            محل سالن روی نقشه<span className="text-g-danger"> *</span>
          </p>
          <div className="h-60 overflow-hidden rounded-2xl border border-g-line-strong">
            <LocationPickerLoader value={pin} onChange={setPin} center={center} />
          </div>
          <p className="mt-2 px-1 text-xs leading-5 text-g-faint">
            {pin ? (
              <>
                پین ثبت شد؛ برای جابه‌جایی آن را بکشید.{" "}
                <span dir="ltr">{toPersianDigits(`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`)}</span>
              </>
            ) : (
              "روی محل دقیق سالن بزنید یا «موقعیت من» را بزنید. با انتخاب استان، نقشه به آن‌جا می‌رود."
            )}
          </p>
        </div>

        <GradientButton type="submit" loading={loading} loadingLabel="در حال ثبت‌نام…" className="g-rise mt-2" style={rise(8)}>
          ثبت‌نام و ساخت سالن
        </GradientButton>
      </form>
    </AuthCard>
  );
}

function StepTitle({ n, i, children }: { n: string; i: number; children: React.ReactNode }) {
  return (
    <p className="g-rise mt-2 flex items-center gap-2.5 text-sm font-bold text-g-ink first:mt-0" style={rise(i)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-g-accent/40 bg-g-accent/10 text-xs text-g-accent">{n}</span>
      {children}
      <span className="h-px flex-1 bg-gradient-to-l from-g-line to-transparent" />
    </p>
  );
}
