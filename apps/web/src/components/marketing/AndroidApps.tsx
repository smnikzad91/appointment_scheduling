import Link from "next/link";
import { CalendarCheck, Download, Smartphone, Wallet } from "lucide-react";

// Landing section «اپلیکیشن»: one Android app for every role — details and downloads on /download-app.
const POINTS = [
  { icon: CalendarCheck, title: "مشتری", text: "جست‌وجوی سالن و آرایشگر، رزرو و پیش‌پرداخت از کیف پول، تغییر یا لغو نوبت و ثبت نظر." },
  { icon: Smartphone, title: "آرایشگر و سالن", text: "برنامه روزانه، اعلان نوبت جدید، تایید نوبت‌ها، ساعت کاری و مرخصی، حسابداری و درآمد." },
  { icon: Wallet, title: "کیف پول", text: "شارژ خودکار، پیش‌پرداخت و دریافت سهم، برداشت به حساب بانکی؛ با همان حساب سایت." },
];

export default function AndroidApps() {
  return (
    <section id="apps" className="scroll-mt-20 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="g-glass g-glow-border g-reveal relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-14">
          <div aria-hidden className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(224_80_122/0.35),transparent_70%)]" />
          <span className="g-kicker relative">اپلیکیشن اندروید</span>
          <h2 className="relative mt-4 text-3xl font-black text-g-ink sm:text-[40px]">
            یک اپ، <span className="g-gradient-text">برای همه</span>
          </h2>
          <p className="relative mt-4 text-g-muted">مشتری، آرایشگر، سالن و آرایشگر مستقل؛ هر کس با حساب خودش وارد پنل خودش می‌شود.</p>

          <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
            {POINTS.map((p) => (
              <div key={p.title} className="g-glass-soft rounded-3xl p-6 text-start transition hover:border-g-line-strong">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-g-accent-3">
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="text-lg font-bold text-g-ink">{p.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-g-muted">{p.text}</p>
              </div>
            ))}
          </div>

          <Link href="/download-app" className="g-btn-primary relative mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bold">
            <Download className="h-5 w-5" aria-hidden /> دانلود اپلیکیشن
          </Link>
        </div>
      </div>
    </section>
  );
}
