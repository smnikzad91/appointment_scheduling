"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, LogOut, MessageSquareText } from "lucide-react";
import { requestOtp, verifyOtp } from "@/lib/api/bookings";
import { loadCustomerSession, saveCustomerSession, clearCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeDigits, isValidIranianMobile, toPersianDigits, splitFullName } from "@/lib/persian";
import CustomerBookings from "@/components/app/CustomerBookings";
import { Button, Card, Field, IconButton, ListSkeleton, TextInput } from "@/components/app/ui";

const OTP_LENGTH = 5;

export default function MyBookingsPage() {
  const [session, setSession] = useState<CustomerSession | null | undefined>(undefined);

  useEffect(() => {
    // One-time localStorage read on mount — must stay in an effect (not a lazy useState
    // initializer) so the server-rendered pass and the client's first hydration pass both
    // start from `undefined`, avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(loadCustomerSession());
  }, []);

  const logout = useCallback(() => {
    clearCustomerSession();
    setSession(null);
  }, []);

  if (session === undefined) return <ListSkeleton rows={3} />;

  if (!session) {
    return (
      <LoginCard
        onLoggedIn={(s) => {
          saveCustomerSession(s);
          setSession(s);
        }}
      />
    );
  }

  return (
    <CustomerBookings
      token={session.token}
      onUnauthorized={logout}
      headerAction={<IconButton icon={LogOut} label="خروج" onClick={logout} tone="plain" />}
    />
  );
}

function LoginCard({ onLoggedIn }: { onLoggedIn: (session: CustomerSession) => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeDigits(phone);
    if (!name.trim()) {
      setError("لطفاً نام خود را وارد کنید");
      return;
    }
    if (!isValidIranianMobile(normalized)) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }
    setError(null);
    setLoading(true);
    setPhone(normalized);
    try {
      const { devCode } = await requestOtp(normalized);
      // No SMS provider yet: the API returned the code, so sign in without the code step.
      if (devCode) {
        const { accessToken, user } = await verifyOtp(normalized, devCode, splitFullName(name));
        onLoggedIn({ token: accessToken, firstName: user.firstName });
        return;
      }
      setStep("otp");
    } catch {
      setError("ارسال کد تایید ممکن نشد، دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await verifyOtp(phone, code, splitFullName(name));
      onLoggedIn({ token: accessToken, firstName: user.firstName });
    } catch {
      setError("کد وارد شده صحیح نیست");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-5 mt-4 flex flex-col items-center text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-app-accent-soft text-app-accent">
          {step === "phone" ? <CalendarHeart className="h-8 w-8" aria-hidden /> : <MessageSquareText className="h-8 w-8" aria-hidden />}
        </span>
        <h1 className="text-[26px] font-black text-app-ink">نوبت‌های من</h1>
        <p className="mt-1 max-w-xs text-sm leading-7 text-app-muted">
          {step === "phone" ? (
            "برای دیدن، لغو یا ثبت نظر روی نوبت‌هایتان، با شماره موبایل وارد شوید."
          ) : (
            <>
              کد {toPersianDigits(OTP_LENGTH)} رقمی به <span dir="ltr">{toPersianDigits(phone)}</span> پیامک شد.
            </>
          )}
        </p>
      </div>

      <Card className="p-5">
        {step === "phone" ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
            <Field label="نام و نام خانوادگی">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="مثلاً سارا احمدی" />
            </Field>
            <Field label="شماره موبایل">
              <TextInput
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                className="text-end"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              />
            </Field>
            {error && <p className="text-sm font-medium text-app-danger">{error}</p>}
            <Button type="submit" block busy={loading}>
              دریافت کد تایید
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => setCode(normalizeDigits(e.target.value).replace(/\D/g, ""))}
              placeholder="-----"
              aria-label="کد تایید"
              autoFocus
              className="h-14 text-center text-2xl font-black tracking-[0.6em]"
            />
            {error && <p className="text-sm font-medium text-app-danger">{error}</p>}
            <Button type="submit" block busy={loading} disabled={code.length !== OTP_LENGTH}>
              تایید و ورود
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            >
              تغییر شماره
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}
