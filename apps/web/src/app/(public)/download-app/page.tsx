import type { Metadata } from "next";
import { CircleCheck, Download, Hourglass, Info, ShoppingBag, Smartphone, Star } from "lucide-react";
import { latestPublished, storeLinks } from "@/lib/appReleases/releases";
import { rise } from "@/components/guest/motion";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// «اپلیکیشن»: the one Android app for every role (customer, stylist, salon, independent), laid out
// like devtrader.ir/download-app — the latest published release (/admin/app-releases) with a direct
// download, Cafe Bazaar and Myket (marked «به‌زودی» until set in admin), what's new, how to install.

export const revalidate = 60;

export const metadata: Metadata = {
  title: `دانلود اپلیکیشن اندروید ${SITE_NAME}`,
  description: "اپ اندروید نوبتت برای مشتری‌ها، آرایشگرها و سالن‌ها: رزرو و مدیریت نوبت، کیف پول و اعلان‌ها. دانلود مستقیم، کافه‌بازار و مایکت.",
  alternates: { canonical: `${SITE_URL}/download-app` },
};

const STEPS = [
  "روی «دانلود مستقیم» بزنید و منتظر بمانید تا دانلود تمام شود.",
  "فایل دانلودشده را از اعلان‌ها یا پوشه Downloads باز کنید.",
  "اگر گوشی اجازه نصب از این منبع را پرسید، یک بار اجازه دهید؛ این پیام عادی است.",
  "مراحل نصب را تمام کنید و با شماره موبایل خود وارد شوید.",
];

export default async function DownloadAppPage() {
  const [release, links] = await Promise.all([latestPublished().catch(() => null), storeLinks().catch(() => null)]);
  const stores = [
    { key: "bazaar", name: "کافه‌بازار", url: links?.bazaarUrl, soon: links?.bazaarComingSoon ?? true },
    { key: "myket", name: "مایکت", url: links?.myketUrl, soon: links?.myketComingSoon ?? true },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-16 pt-28 sm:pt-32">
      <section className="flex flex-col items-center text-center">
        <span className="g-rise flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 text-g-accent ring-1 ring-white/10" style={rise(0)}>
          <Smartphone className="h-10 w-10" aria-hidden />
        </span>
        <span className="g-kicker g-rise mt-5 inline-flex items-center gap-1.5" style={rise(1)}>
          <CircleCheck className="h-4 w-4" aria-hidden /> اپلیکیشن رسمی اندروید
        </span>
        <h1 className="g-rise mt-4 text-3xl font-black text-g-ink sm:text-[40px]" style={rise(2)}>
          {SITE_NAME} <span className="g-gradient-text">در جیب شما</span>
        </h1>
        <p className="g-rise mt-4 leading-8 text-g-muted" style={rise(3)}>
          یک اپ برای همه: مشتری‌ها نوبت می‌گیرند و پیش‌پرداخت می‌کنند، آرایشگرها و سالن‌ها نوبت‌ها، کیف پول و درآمدشان را مدیریت می‌کنند؛ با همان حساب سایت.
        </p>
      </section>

      <section className="g-glass g-glow-border g-rise rounded-[2rem] p-6 text-center sm:p-8" style={rise(4)}>
        {release ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-g-muted">
              <span>
                نسخه: <strong className="text-g-ink" dir="ltr">{release.versionName}</strong>
              </span>
              <span>
                حجم: <strong className="text-g-ink">{toPersianDigits((release.size / (1024 * 1024)).toFixed(1))} مگابایت</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-g-accent/15 px-2.5 py-0.5 text-xs font-bold text-g-accent">
                <Star className="h-3.5 w-3.5" aria-hidden /> {formatSalonDate(release.publishedAt ?? release.createdAt)}
              </span>
            </div>
            <a href={`/download/${release.fileName}`} className="g-btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold sm:w-auto">
              <Download className="h-5 w-5" aria-hidden /> دانلود مستقیم برای اندروید
            </a>
            <p className="mt-3 text-xs text-g-faint">نیازمند اندروید ۸ یا جدیدتر</p>
          </>
        ) : (
          <div className="py-4">
            <Hourglass className="mx-auto h-8 w-8 text-g-accent" aria-hidden />
            <p className="mt-3 font-bold text-g-ink">هنوز نسخه‌ای منتشر نشده است</p>
            <p className="mt-1 text-sm text-g-muted">اپ اندروید به‌زودی منتشر می‌شود؛ کمی بعد دوباره سر بزنید.</p>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {stores.map((s) =>
            s.url && !s.soon ? (
              <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="g-glass-soft flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-g-ink transition hover:border-g-line-strong">
                <ShoppingBag className="h-5 w-5 text-g-accent" aria-hidden /> دریافت از {s.name}
              </a>
            ) : (
              <span key={s.key} aria-disabled className="g-glass-soft flex cursor-default items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-g-faint">
                <ShoppingBag className="h-5 w-5" aria-hidden /> {s.name}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-g-muted">به‌زودی</span>
              </span>
            ),
          )}
        </div>
      </section>

      {release?.notes && (
        <section className="g-glass rounded-3xl p-6">
          <h2 className="font-bold text-g-ink">تازه‌های این نسخه</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-g-muted">{release.notes}</p>
        </section>
      )}

      <section className="g-glass rounded-3xl p-6">
        <h2 className="font-bold text-g-ink">نحوه نصب</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-7 text-g-muted marker:font-bold marker:text-g-accent">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="g-glass rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-bold text-g-ink">
          <Info className="h-5 w-5 text-g-accent" aria-hidden /> چرا دانلود مستقیم؟
        </h2>
        <p className="mt-3 text-sm leading-7 text-g-muted">
          نسخه مستقیم همین‌جا منتشر می‌شود و به‌روزرسانی‌ها بدون صبر برای بررسی فروشگاه‌ها، از داخل خود اپ می‌رسند. نسخه کافه‌بازار و مایکت هم به‌زودی در دسترس است.
        </p>
      </section>
    </div>
  );
}
