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
import { FloatingInput, FloatingTextArea, PasswordInput, PasswordStrength } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import { rise } from "@/components/guest/motion";
import { planFeatureLines, planPriceLabel, type PricingPlanData } from "@/lib/pricing";
import { SERVICE_LOCATIONS, SERVICE_LOCATION_HINT, SERVICE_LOCATION_LABEL, type SalonKind, type ServiceLocation } from "@/lib/independent";
import { useBackgroundDraft } from "@/lib/useBackgroundDraft";
import { toastError } from "@/lib/toastError";

export type SignUpPlan = Pick<PricingPlanData, "id" | "name" | "monthlyPriceToman" | "maxStylists" | "smsPerMonth" | "features" | "recommended">;

export default function SignUpSalonForm({
  plans,
  initialPlanId,
  trialDays,
  initialKind = "SALON",
}: {
  plans: SignUpPlan[];
  initialPlanId: string | null;
  trialDays: number;
  /** "INDEPENDENT" when opened as ?type=independent (an independent stylist's own business). */
  initialKind?: SalonKind;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<SalonKind>(initialKind);
  const independent = kind === "INDEPENDENT";
  const [serviceLocations, setServiceLocations] = useState<ServiceLocation[]>([]);
  const [serviceArea, setServiceArea] = useState("");
  const [hostSalonName, setHostSalonName] = useState("");
  const [planId, setPlanId] = useState(initialPlanId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [place, setPlace] = useState({ province: "", city: "" });
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);

  // The choices that aren't plain text fields (FormDraftKeeper brings those back), kept if the OS
  // kills the app while they're in another app — e.g. fetching the salon's address.
  useBackgroundDraft(
    "signup-salon",
    () =>
      place.province || pin || serviceLocations.length || kind !== initialKind
        ? { kind, serviceLocations, place, pin, planId }
        : null,
    (d) => {
      setKind(d.kind);
      setServiceLocations(d.serviceLocations);
      setPlace(d.place);
      setPin(d.pin);
      setPlanId(d.planId);
    },
  );

  const IRANIAN_MOBILE = /^09[0-9]{9}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!IRANIAN_MOBILE.test(phone)) {
      toastError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)");
      return;
    }
    if (independent && serviceLocations.length === 0) {
      toastError("مشخص کنید کجا خدمات می‌دهید");
      return;
    }
    if (!place.province || !place.city) {
      toastError(independent ? "استان و شهر محل کارتان را انتخاب کنید" : "استان و شهر سالن را انتخاب کنید");
      return;
    }
    if (!pin) {
      toastError(
        independent
          ? "محل کارتان را روی نقشه مشخص کنید تا مشتری‌های نزدیک شما را پیدا کنند"
          : "محل سالن را روی نقشه مشخص کنید تا مشتری‌ها بتوانند آن را پیدا کنند",
      );
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
        planId: planId ?? undefined,
        ...(independent && {
          kind,
          serviceLocations,
          serviceArea: serviceArea.trim() || undefined,
          hostSalonName: (serviceLocations.includes("IN_SALON") && hostSalonName.trim()) || undefined,
        }),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toastError(data.error || "خطا در ثبت‌نام");
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
      title={independent ? "کسب‌وکارتان را آنلاین کنید" : "سالن‌تان را آنلاین کنید"}
      subtitle={
        independent
          ? "برای آرایشگرهای مستقل: با نام خودتان نوبت بگیرید؛ خدمات، ساعات کاری، نوبت‌ها و درآمد خودتان."
          : "ثبت رایگان؛ چند دقیقه دیگر لینک رزرو اختصاصی سالن آماده است."
      }
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟ <AuthLink href="/signin">وارد شوید</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div role="radiogroup" aria-label="نوع کسب‌وکار" className="g-rise grid grid-cols-2 gap-2.5" style={rise(2.5)}>
          {(
            [
              ["SALON", "صاحب سالن هستم", "سالن با یک یا چند آرایشگر"],
              ["INDEPENDENT", "آرایشگر مستقل هستم", "با نام خودم؛ در سالنی دیگر، استودیو یا خدمات در منزل"],
            ] as const
          ).map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`flex flex-col gap-1 rounded-2xl border p-3.5 text-start transition ${
                kind === value ? "border-g-accent bg-g-accent/10" : "border-g-line-strong hover:border-g-accent/50"
              }`}
            >
              <span className="font-bold text-g-ink">{title}</span>
              <span className="text-xs leading-5 text-g-muted">{hint}</span>
            </button>
          ))}
        </div>

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

        <StepTitle n="۲" i={5}>{independent ? "کسب‌وکار شما" : "سالن"}</StepTitle>
        <FloatingInput
          className="g-rise"
          style={rise(5.5)}
          label={independent ? "نام کاری" : "نام سالن"}
          hint={independent ? "نامی که مشتری‌ها می‌بینند، مثلاً رزا میکاپ" : "مثلاً سالن زیبایی رزا"}
          required
          value={salonName}
          onChange={(e) => setSalonName(e.target.value)}
        />
        {independent && (
          <div className="g-rise flex flex-col gap-2" style={rise(5.75)}>
            <p className="px-1 text-[13px] text-g-muted">
              کجا خدمات می‌دهید؟<span className="text-g-danger"> *</span>
            </p>
            {SERVICE_LOCATIONS.map((loc) => {
              const on = serviceLocations.includes(loc);
              return (
                <button
                  key={loc}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setServiceLocations((list) => (on ? list.filter((l) => l !== loc) : [...list, loc]))}
                  className={`flex flex-col gap-0.5 rounded-2xl border px-3.5 py-3 text-start transition ${
                    on ? "border-g-accent bg-g-accent/10" : "border-g-line-strong hover:border-g-accent/50"
                  }`}
                >
                  <span className="text-sm font-bold text-g-ink">{SERVICE_LOCATION_LABEL[loc]}</span>
                  <span className="text-xs leading-5 text-g-muted">{SERVICE_LOCATION_HINT[loc]}</span>
                </button>
              );
            })}
            {serviceLocations.includes("IN_SALON") && (
              <FloatingInput
                label="نام سالنی که در آن کار می‌کنید"
                hint="اختیاری؛ مثلاً سالن زیبایی رز"
                maxLength={100}
                value={hostSalonName}
                onChange={(e) => setHostSalonName(e.target.value)}
              />
            )}
            {serviceLocations.includes("CLIENT_HOME") && (
              <FloatingInput
                label="محدوده خدمات در منزل"
                hint="مثلاً کل قائم‌شهر و ساری"
                maxLength={200}
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
              />
            )}
          </div>
        )}
        <div className="g-rise" style={rise(6)}>
          <ProvinceCitySelect value={place} onChange={setPlace} required selectClassName="g-select" labelClassName="px-1 text-[13px] text-g-muted" />
        </div>
        <FloatingTextArea
          className="g-rise"
          style={rise(6.5)}
          label={independent ? (serviceLocations.includes("IN_SALON") ? "آدرس سالن محل کار" : "آدرس محل کار") : "آدرس دقیق"}
          hint={
            independent && !serviceLocations.some((l) => l === "IN_SALON" || l === "STUDIO")
              ? "فقط مشتری‌ای که نوبت گرفته آن را می‌بیند"
              : "خیابان، کوچه، پلاک، طبقه"
          }
          rows={2}
          required
          minLength={5}
          maxLength={300}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="g-rise" style={rise(7)}>
          <p className="mb-1.5 px-1 text-[13px] text-g-muted">
            {independent ? "محل کار روی نقشه" : "محل سالن روی نقشه"}
            <span className="text-g-danger"> *</span>
          </p>
          {independent && !serviceLocations.some((l) => l === "IN_SALON" || l === "STUDIO") && (
            <p className="mb-1.5 px-1 text-xs leading-5 text-g-faint">فقط حدود محله (نه نقطه دقیق) در جست‌وجو نشان داده می‌شود.</p>
          )}
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

        {plans.length > 0 && (
          <>
            <StepTitle n="۳" i={7.5}>پلن</StepTitle>
            <div role="radiogroup" aria-label="انتخاب پلن" className="g-rise grid gap-2.5 sm:grid-cols-2" style={rise(7.75)}>
              {plans.map((plan) => (
                <PlanOption key={plan.id} plan={plan} selected={plan.id === planId} onSelect={() => setPlanId(plan.id)} />
              ))}
            </div>
            <p className="g-rise -mt-1 px-1 text-xs leading-5 text-g-faint" style={rise(7.75)}>
              {trialDays > 0
                ? `${toPersianDigits(trialDays)} روز اول رایگان است؛ بعداً می‌توانید پلن را عوض کنید.`
                : "بعداً می‌توانید پلن را عوض کنید."}
            </p>
          </>
        )}

        <GradientButton type="submit" loading={loading} loadingLabel="در حال ثبت‌نام…" className="g-rise mt-2" style={rise(8)}>
          {independent ? "ثبت‌نام آرایشگر مستقل" : "ثبت‌نام و ساخت سالن"}
        </GradientButton>
      </form>
    </AuthCard>
  );
}

function PlanOption({ plan, selected, onSelect }: { plan: SignUpPlan; selected: boolean; onSelect: () => void }) {
  const price = planPriceLabel(plan.monthlyPriceToman);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col gap-1 rounded-2xl border p-3.5 text-start transition ${
        selected ? "border-g-accent bg-g-accent/10" : "border-g-line-strong hover:border-g-accent/50"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-bold text-g-ink">{plan.name}</span>
        {plan.recommended && <span className="rounded-full bg-g-accent/15 px-2 py-0.5 text-[11px] font-bold text-g-accent">پیشنهادی</span>}
      </span>
      <span className="text-sm font-semibold text-g-ink">
        {price.amount}
        {price.perMonth && <span className="text-xs font-normal text-g-faint"> تومان / ماه</span>}
      </span>
      <span className="text-xs leading-5 text-g-muted">{planFeatureLines(plan).slice(0, 2).join("، ")}</span>
    </button>
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
