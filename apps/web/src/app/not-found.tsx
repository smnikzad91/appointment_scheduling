import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "صفحه پیدا نشد | Assist Me",
  description: "صفحه‌ای که دنبالش هستید وجود ندارد یا جابه‌جا شده است.",
};

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="font-vazirmatn relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-6 dark:bg-gray-900"
    >
      {/* dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* glow orb */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/20" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        {/* 404 number */}
        <div
          className="relative select-none"
          style={{ animation: "float 4s ease-in-out infinite" }}
        >
          <span
            className="text-[10rem] font-extrabold leading-none tracking-tighter text-brand-500 sm:text-[13rem]"
            style={{ opacity: 0.15 }}
          >
            ۴۰۴
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* broken chart icon */}
            <svg
              viewBox="0 0 120 80"
              className="w-32 sm:w-44 text-brand-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="8,65 30,42 50,55 70,28" strokeDasharray="6 4" />
              <polyline points="70,28 85,15" />
              {/* break */}
              <polyline points="90,40 100,52 112,35" className="opacity-40" />
              {/* x mark at break */}
              <line x1="76" y1="22" x2="84" y2="30" strokeWidth="2.5" className="text-error-400" stroke="#f97316" />
              <line x1="84" y1="22" x2="76" y2="30" strokeWidth="2.5" stroke="#f97316" />
            </svg>
          </div>
        </div>

        {/* text */}
        <div style={{ animation: "fade-in-up 0.6s ease 0.1s both" }}>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">
            صفحه پیدا نشد
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-gray-500 dark:text-gray-400">
            به نظر می‌رسد این صفحه مثل یک سیگنال گم‌شده — وجود ندارد یا جابه‌جا شده.
          </p>
        </div>

        {/* actions */}
        <div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animation: "fade-in-up 0.6s ease 0.25s both" }}
        >
          <Link
            href="/"
            className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-brand-500/40"
          >
            بازگشت به خانه
          </Link>
          <Link
            href="/blog"
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:border-brand-300 hover:text-brand-500 hover:-translate-y-0.5 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:text-brand-400"
          >
            مطالعه وبلاگ
          </Link>
        </div>

        {/* hint links */}
        <p
          className="mt-10 text-xs text-gray-400 dark:text-gray-600"
          style={{ animation: "fade-in-up 0.6s ease 0.4s both" }}
        >
          یا به{" "}
          <Link href="/pricing" className="text-brand-400 hover:underline">قیمت‌گذاری</Link>
          {" "}،{" "}
          <Link href="/signin" className="text-brand-400 hover:underline">ورود</Link>
          {" "}یا{" "}
          <Link href="/signup" className="text-brand-400 hover:underline">ثبت‌نام</Link>
          {" "}بروید.
        </p>

      </div>
    </div>
  );
}
