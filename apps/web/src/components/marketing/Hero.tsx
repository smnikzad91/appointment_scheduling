import Link from "next/link";
import { Check } from "lucide-react";
import PhoneMockup from "./PhoneMockup";

const CHECKS = ["تقویم شمسی", "ورود با شماره موبایل", "پرداخت بیعانه با درگاه داخلی"];

export default function Hero() {
  return (
    <section className="bg-[#f7f0e8]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="order-2 md:order-1">
          <PhoneMockup />
        </div>

        <div className="order-1 text-center md:order-2 md:text-start">
          <span className="inline-block rounded-full bg-[#ede6d4] px-4 py-1.5 text-xs font-medium text-[#2a1d26]">
            سامانه نوبت‌دهی آنلاین مخصوص سالن‌های زیبایی
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-[#2a1d26] sm:text-5xl">
            نوبت بگیرید،
            <br />
            بدون تماس و بدون انتظار
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            مشتری‌ها در هر ساعت از شبانه‌روز خدمت، آرایشگر و زمان دلخواه را انتخاب می‌کنند. شما تقویم را مدیریت
            می‌کنید و پیامک یادآوری خودکار ارسال می‌شود.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/signup-salon"
              className="rounded-lg bg-[#a34a30] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#8f3f28]"
            >
              شروع رایگان برای سالن
            </Link>
            <Link
              href="/salons"
              className="rounded-lg border border-[#2a1d26]/15 bg-white px-6 py-3 text-sm font-bold text-[#2a1d26] transition hover:border-[#2a1d26]/30"
            >
              پیدا کردن سالن و رزرو نوبت
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 md:justify-start">
            {CHECKS.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
