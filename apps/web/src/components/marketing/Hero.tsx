import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import PhoneMockup from "./PhoneMockup";
import { rise } from "@/components/guest/motion";

const CHECKS = ["تقویم شمسی", "ورود با شماره موبایل", "پرداخت بیعانه با درگاه داخلی"];

export default function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-2 md:pb-28 md:pt-24">
        <div className="text-center md:text-start">
          {/* Full brand logo (medal + arched text + wordmark), branding/logo_vertical_with_text.png */}
          <Image
            src="/images/logo/logo_vertical_with_text.png"
            alt="نوبتت — سامانه نوبت دهی آنلاین زیبایی"
            width={554}
            height={610}
            priority
            sizes="176px"
            className="g-rise mx-auto mb-7 h-auto w-40 rounded-3xl shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8)] ring-1 ring-white/5 sm:w-44 md:mx-0"
            style={rise(0)}
          />
          <span className="g-kicker g-rise" style={rise(0)}>
            سامانه نوبت‌دهی آنلاین مخصوص سالن‌های زیبایی
          </span>

          <h1 className="g-rise mt-6 text-[40px] font-black leading-[1.25] text-g-ink sm:text-6xl sm:leading-[1.2]" style={rise(1)}>
            نوبت بگیرید،
            <br />
            <span className="g-gradient-text">بدون تماس و انتظار</span>
          </h1>

          <p className="g-rise mx-auto mt-6 max-w-lg text-[17px] leading-9 text-g-muted md:mx-0" style={rise(2)}>
            مشتری‌ها در هر ساعت از شبانه‌روز خدمت، آرایشگر و زمان دلخواه را انتخاب می‌کنند. شما تقویم را مدیریت می‌کنید و
            پیامک یادآوری خودکار ارسال می‌شود.
          </p>

          <div className="g-rise mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start" style={rise(3)}>
            <Link href="/signup-salon" className="g-btn g-btn-primary h-14 px-7 text-[15px]">
              شروع رایگان برای سالن
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/salons" className="g-btn g-btn-ghost h-14 px-7 text-[15px]">
              پیدا کردن سالن و رزرو نوبت
            </Link>
          </div>

          <ul className="g-rise mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-g-muted md:justify-start" style={rise(4)}>
            {CHECKS.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-g-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="g-rise" style={rise(3)}>
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
