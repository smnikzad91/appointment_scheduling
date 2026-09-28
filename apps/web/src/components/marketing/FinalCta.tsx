import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="pb-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="g-glass g-glow-border g-reveal relative flex flex-col items-center gap-7 overflow-hidden rounded-[2rem] px-8 py-14 text-center sm:flex-row sm:justify-between sm:text-start">
          <div aria-hidden className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(242_135_106/0.4),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-2xl font-black text-g-ink sm:text-3xl">سالن‌تان را امروز آنلاین کنید</h2>
            <p className="mt-2 text-g-muted">راه‌اندازی در کمتر از یک روز، با پشتیبانی فارسی.</p>
          </div>
          <Link href="/signup-salon" className="g-btn g-btn-primary relative h-14 shrink-0 px-8 text-[15px]">
            شروع رایگان
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
