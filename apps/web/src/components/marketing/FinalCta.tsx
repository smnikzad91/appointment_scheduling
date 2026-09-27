import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="bg-[#f7f0e8] pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-[#ede6d4] px-8 py-14 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <h2 className="text-2xl font-extrabold text-[#2a1d26] sm:text-3xl">سالن‌تان را امروز آنلاین کنید</h2>
            <p className="mt-2 text-gray-600">راه‌اندازی در کمتر از یک روز، با پشتیبانی فارسی.</p>
          </div>
          <Link
            href="/signup-salon"
            className="shrink-0 rounded-lg bg-[#a34a30] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#8f3f28]"
          >
            شروع رایگان
          </Link>
        </div>
      </div>
    </section>
  );
}
