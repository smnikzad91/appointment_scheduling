import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SalonResultCard from "@/components/discovery/SalonResultCard";
import GuestBackdrop from "@/components/guest/GuestBackdrop";
import GuestLogo from "@/components/guest/GuestLogo";
import GuestTabBar from "@/components/guest/GuestTabBar";
import { rise } from "@/components/guest/motion";
import { JsonLd } from "@/components/common/JsonLd";
import { searchSalons } from "@/lib/api/discovery";
import { activeCities, findCity } from "@/lib/cityPages";
import { fillSeoTemplate, getPageSeo } from "@/lib/pageSeo";
import { toPersianDigits } from "@/lib/persian";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// City landing page (/salons/<city>, lib/cityPages.ts): what people search for — «آرایشگاه
// قائم‌شهر» — answered with the city's salons, rendered on the server so search engines read it.
// Title / description / keywords: the «city-page» template at /admin/seo-settings.

export const revalidate = 300;

type PageProps = { params: Promise<{ city: string }> };

const pageUrl = (slug: string) => `${SITE_URL}/salons/${encodeURIComponent(slug)}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const c = await findCity((await params).city);
  if (!c) return { title: "شهر پیدا نشد", robots: { index: false, follow: true } };
  const seo = await getPageSeo("city-page");
  const vars = { city: c.city, province: c.province, count: toPersianDigits(c.count) };
  const title = fillSeoTemplate(seo.title, vars);
  const description = fillSeoTemplate(seo.description, vars);
  const url = pageUrl(c.slug);
  return {
    title,
    description,
    keywords: seo.keywords.map((k) => fillSeoTemplate(k, vars)),
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, type: "website", locale: "fa_IR", images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  };
}

/** The services offered most often in the city, for the intro (each salon counts once). */
function popularServices(services: string[][], max = 6): string[] {
  const n = new Map<string, number>();
  for (const list of services) for (const s of new Set(list.map((x) => x.trim()).filter(Boolean))) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([s]) => s);
}

export default async function CityPage({ params }: PageProps) {
  const c = await findCity((await params).city);
  if (!c) notFound();
  const [result, cities] = await Promise.all([
    searchSalons({ city: c.city, province: c.province || undefined, sort: "rating", limit: 50 }).catch(() => null),
    activeCities(),
  ]);
  const salons = result?.items ?? [];
  if (salons.length === 0 && result) notFound();
  const salonCount = salons.filter((s) => s.kind !== "INDEPENDENT").length;
  const independentCount = salons.length - salonCount;
  const services = popularServices(salons.map((s) => s.services));
  const others = cities.filter((x) => x.slug !== c.slug).slice(0, 24);
  const fa = toPersianDigits;

  const counted = [salonCount && `${fa(salonCount)} سالن زیبایی`, independentCount && `${fa(independentCount)} آرایشگر مستقل`].filter(Boolean).join(" و ");
  const faqs = [
    {
      q: `چطور در ${c.city} آنلاین نوبت آرایشگاه بگیرم؟`,
      a: `سالن یا آرایشگر را از فهرست همین صفحه انتخاب کنید، خدمت و ساعت خالی را بزنید و با شماره موبایل نوبت را ثبت کنید؛ بدون تماس تلفنی و در هر ساعت از شبانه‌روز. نوبت پس از تایید آرایشگر قطعی می‌شود و پیامک تایید و یادآوری برایتان می‌آید.`,
    },
    {
      q: "پیش‌پرداخت نوبت چقدر است و اگر لغو شود چه می‌شود؟",
      a: "برای رزرو آنلاین، نیمی از مبلغ نوبت از کیف پول شما پیش‌پرداخت می‌شود و باقی را در محل یا از کیف پول می‌پردازید. اگر نوبت لغو شود، پیش‌پرداخت کامل به کیف پول شما برمی‌گردد.",
    },
    {
      q: `سالن یا آرایشگر مستقل در ${c.city} هستم؛ چطور اینجا دیده شوم؟`,
      a: `در ${SITE_NAME} ثبت‌نام کنید، خدمات و ساعت‌های کاری را وارد کنید؛ پس از تایید، صفحه رزرو شما در همین فهرست ${c.city} و در جستجوی سالن‌ها نمایش داده می‌شود.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "سالن‌های زیبایی", item: `${SITE_URL}/salons` },
          { "@type": "ListItem", position: 3, name: c.city, item: pageUrl(c.slug) },
        ],
      },
      {
        "@type": "ItemList",
        name: `آرایشگاه‌ها و سالن‌های زیبایی ${c.city}`,
        itemListElement: salons.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE_URL}/s/${s.slug}` })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <div dir="rtl" className="app-root guest-root min-h-dvh">
      <GuestBackdrop />
      <JsonLd data={jsonLd} />
      <header className="app-pt-safe sticky top-0 z-40 border-b border-g-line bg-g-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <GuestLogo />
          <Link href="/salons" className="g-btn g-btn-ghost h-10 px-4 text-sm">
            همه شهرها
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <nav aria-label="مسیر" className="mb-3 text-xs text-g-muted">
          <Link href="/" className="hover:text-g-ink">{SITE_NAME}</Link>
          {" › "}
          <Link href="/salons" className="hover:text-g-ink">سالن‌های زیبایی</Link>
          {" › "}
          <span className="text-g-ink">{c.city}</span>
        </nav>
        <h1 className="g-rise text-[28px] font-black leading-tight text-g-ink" style={rise(0)}>
          آرایشگاه و سالن زیبایی <span className="g-gradient-text">{c.city}</span>
        </h1>
        <p className="g-rise mt-3 text-sm leading-7 text-g-muted" style={rise(1)}>
          {counted ? `${counted} در ${c.city}${c.province && c.province !== c.city ? `، استان ${c.province}` : ""} در ${SITE_NAME} نوبت آنلاین می‌دهند. ` : ""}
          خدمات، قیمت، امتیاز و نظرات مشتری‌ها را ببینید و بدون تماس، در هر ساعت از شبانه‌روز نوبت بگیرید.
        </p>
        {services.length > 0 && (
          <p className="g-rise mt-2 text-sm leading-7 text-g-muted" style={rise(1)}>
            خدمات پرطرفدار در {c.city}: {services.join("، ")}.
          </p>
        )}

        <section className="mt-6 flex flex-col gap-3" aria-label={`سالن‌های ${c.city}`}>
          {salons.map((s, i) => (
            <SalonResultCard key={s.id} salon={s} style={rise(Math.min(i, 6) + 2)} />
          ))}
          {!result && <p className="rounded-2xl border border-g-line p-4 text-sm text-g-muted">فهرست سالن‌ها الان در دسترس نیست؛ کمی بعد دوباره سر بزنید.</p>}
        </section>

        <Link href={`/salons?province=${encodeURIComponent(c.province)}&city=${encodeURIComponent(c.city)}`} className="g-btn g-btn-ghost mt-4 h-12 w-full text-sm">
          جستجو و نقشه سالن‌های {c.city}
        </Link>

        <section className="mt-10">
          <h2 className="text-lg font-black text-g-ink">رزرو آنلاین نوبت آرایشگاه در {c.city}</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-7 text-g-muted">
            <li>سالن یا آرایشگر مستقل را از فهرست بالا انتخاب کنید.</li>
            <li>خدمت، آرایشگر و روز و ساعت خالی را بزنید.</li>
            <li>با شماره موبایل نوبت را ثبت کنید؛ پیامک تایید و یادآوری برایتان ارسال می‌شود.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-black text-g-ink">سوالات رایج</h2>
          <div className="mt-3 space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-bold text-g-ink">{f.q}</h3>
                <p className="mt-1 text-sm leading-7 text-g-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 g-glass rounded-3xl p-5">
          <h2 className="text-base font-black text-g-ink">سالن یا آرایشگر مستقل در {c.city} هستید؟</h2>
          <p className="mt-2 text-sm leading-7 text-g-muted">
            صفحه رزرو آنلاین بسازید: نوبت اینترنتی، پیامک یادآوری، پیش‌پرداخت با کیف پول و حسابداری — همه در {SITE_NAME}.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/signup-salon" className="g-btn g-btn-primary h-12 px-5 text-sm">
              ثبت‌نام سالن
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/signup-salon?type=independent" className="g-btn g-btn-ghost h-12 px-5 text-sm">
              ثبت‌نام آرایشگر مستقل
            </Link>
          </div>
        </section>

        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-black text-g-ink">آرایشگاه‌های شهرهای دیگر</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((o) => (
                <Link key={o.slug} href={`/salons/${encodeURIComponent(o.slug)}`} className="rounded-full border border-g-line px-3 py-1.5 text-sm text-g-ink hover:border-g-accent">
                  آرایشگاه {o.city}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <GuestTabBar />
    </div>
  );
}
