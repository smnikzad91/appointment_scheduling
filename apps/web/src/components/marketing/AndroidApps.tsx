import { Smartphone } from "lucide-react";

const APPS = [
  {
    title: "اپ آرایشگر",
    description: "برنامه روزانه سالن، اعلان نوبت جدید، تنظیم ساعت کاری و مرخصی، و مشاهده سابقه مشتری پیش از شروع کار.",
  },
  {
    title: "اپ مشتری",
    description: "جست‌وجوی خدمت و آرایشگر، رزرو و پرداخت بیعانه، تغییر یا لغو نوبت و ثبت نظر بعد از هر مراجعه.",
  },
];

export default function AndroidApps() {
  return (
    <section id="apps" className="scroll-mt-20 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="g-glass g-glow-border g-reveal relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-14">
          <div aria-hidden className="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(224_80_122/0.35),transparent_70%)]" />
          <span className="g-kicker relative">اپلیکیشن‌های اندروید</span>
          <h2 className="relative mt-4 text-3xl font-black text-g-ink sm:text-[40px]">
            دو اپ، <span className="g-gradient-text">یک سامانه</span>
          </h2>
          <p className="relative mt-4 text-g-muted">برای مشتری که نوبت می‌گیرد و برای آرایشگری که نوبت را انجام می‌دهد.</p>

          <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
            {APPS.map((app) => (
              <div key={app.title} className="g-glass-soft rounded-3xl p-7 text-start transition hover:border-g-line-strong">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-g-accent-3">
                    <Smartphone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="text-lg font-bold text-g-ink">{app.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-7 text-g-muted">{app.description}</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <span className="rounded-xl bg-g-ink px-4 py-2 text-sm font-bold text-g-bg">دریافت از کافه‌بازار</span>
                  <span className="rounded-xl border border-g-line-strong px-4 py-2 text-sm font-bold text-g-ink">دریافت از مایکت</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
