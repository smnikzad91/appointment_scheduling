import type { Metadata } from "next";
import Link from "next/link";
import { Headset, Scissors, ArrowLeft } from "lucide-react";
import AuthCard, { AuthLink } from "@/components/guest/AuthCard";
import { rise } from "@/components/guest/motion";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور",
  robots: { index: false, follow: true },
};

// No SMS provider is wired up yet, so there's no self-service reset code. Point each kind of
// account at the path that works today; swap in an OTP form once apps/api can send SMS.
const OPTIONS = [
  {
    icon: Scissors,
    title: "آرایشگر هستید؟",
    body: "از مدیر سالن بخواهید از صفحه آرایشگرها برایتان «لینک تازه» بسازد. با همان لینک رمز جدید می‌گذارید.",
  },
  {
    icon: Headset,
    title: "مدیر سالن یا مشتری هستید؟",
    body: "به پشتیبانی پیام دهید؛ پس از تأیید شماره موبایل، دسترسی حساب‌تان را بازمی‌گردانیم.",
    href: "/contact",
    cta: "تماس با پشتیبانی",
  },
];

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="رمز را فراموش کرده‌اید؟"
      subtitle="نگران نباشید؛ دسترسی به حساب‌تان را از یکی از این راه‌ها برمی‌گردانیم."
      footer={
        <>
          رمز یادتان آمد؟ <AuthLink href="/signin">بازگشت به ورود</AuthLink>
        </>
      }
    >
      <ul className="flex flex-col gap-3">
        {OPTIONS.map((o, i) => (
          <li key={o.title} className="g-glass-soft g-rise rounded-2xl p-4" style={rise(3 + i)}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-g-accent/30 bg-g-accent/10 text-g-accent">
                <o.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-g-ink">{o.title}</p>
                <p className="mt-1 text-sm leading-7 text-g-muted">{o.body}</p>
                {o.href && (
                  <Link href={o.href} className="g-btn g-btn-primary mt-3 h-11 px-5 text-sm">
                    {o.cta}
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}
