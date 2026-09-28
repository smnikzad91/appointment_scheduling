import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, Clock, Lightbulb, ListOrdered } from "lucide-react";
import { TUTORIALS, TUTORIAL_ROLES, neighbours, tutorialBySlug } from "@/content/tutorials";
import Screenshot from "@/components/tutorials/Screenshot";
import StepToc from "@/components/tutorials/StepToc";
import { ROLE_ICON } from "@/components/tutorials/roleIcons";
import { JsonLd } from "@/components/common/JsonLd";
import { toPersianDigits } from "@/lib/persian";
import { SITE_URL } from "@/lib/site";
import { rise } from "@/components/guest/motion";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;
export function generateStaticParams() {
  return TUTORIALS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = tutorialBySlug((await params).slug);
  if (!t) return {};
  const cover = t.steps.find((s) => s.shot)?.shot;
  return {
    title: `${t.title} | راهنما`,
    description: t.summary,
    alternates: { canonical: `${SITE_URL}/tutorials/${t.slug}` },
    openGraph: { title: t.title, description: t.summary, type: "article", images: cover ? [`/tutorials/${cover}.webp`] : undefined },
  };
}

export default async function TutorialPage({ params }: Props) {
  const t = tutorialBySlug((await params).slug);
  if (!t) notFound();
  const role = TUTORIAL_ROLES.find((r) => r.id === t.role)!;
  const RoleIcon = ROLE_ICON[t.role];
  const { prev, next } = neighbours(t.slug);
  const url = `${SITE_URL}/tutorials/${t.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: t.title,
          description: t.summary,
          totalTime: `PT${t.minutes}M`,
          step: t.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
            url: `${url}#step-${i + 1}`,
            image: s.shot ? `${SITE_URL}/tutorials/${s.shot}.webp` : undefined,
          })),
        }}
      />

      <nav aria-label="مسیر" className="g-rise mb-6 flex flex-wrap items-center gap-1 text-[13px] text-g-faint" style={rise(0)}>
        <Link href="/tutorials" className="hover:text-g-ink">
          راهنما
        </Link>
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        <Link href={`/tutorials?role=${t.role}`} className="hover:text-g-ink">
          {role.label}
        </Link>
      </nav>

      <header className="max-w-3xl">
        <span className="g-kicker g-rise" style={rise(1)}>
          <RoleIcon className="h-3.5 w-3.5" aria-hidden />
          {role.label}
        </span>
        <h1 className="g-rise mt-4 text-3xl font-black leading-snug text-g-ink sm:text-[42px]" style={rise(2)}>
          {t.title}
        </h1>
        <p className="g-rise mt-3 text-[15px] leading-8 text-g-muted" style={rise(3)}>
          {t.summary}
        </p>
        <p className="g-rise mt-4 flex items-center gap-4 text-sm text-g-faint" style={rise(4)}>
          <span className="flex items-center gap-1.5">
            <ListOrdered className="h-4 w-4" aria-hidden />
            {toPersianDigits(t.steps.length)} مرحله
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            حدود {toPersianDigits(t.minutes)} دقیقه
          </span>
        </p>
      </header>

      {/* phones: sticky step chips under the site header */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 border-y border-g-line bg-g-bg/75 px-4 backdrop-blur-xl lg:hidden">
        <StepToc steps={t.steps} variant="strip" />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <ol className="flex flex-col gap-6">
          {t.steps.map((s, i) => (
            <li key={i} id={`step-${i + 1}`} className="g-glass-soft g-reveal scroll-mt-36 rounded-[28px] p-5 sm:p-7 lg:scroll-mt-24">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--g-gradient)] text-base font-black text-[#1a0f14] shadow-[0_10px_26px_-10px_rgb(242_135_106/0.9)]">
                      {toPersianDigits(i + 1)}
                    </span>
                    <h2 className="text-lg font-black leading-8 text-g-ink sm:text-xl">{s.title}</h2>
                  </div>
                  <p className="mt-4 text-[15px] leading-8 text-g-muted">{s.body}</p>
                  {s.tip && (
                    <p className="mt-4 flex gap-2.5 rounded-2xl border border-g-accent-3/25 bg-g-accent-3/10 p-3.5 text-[13px] leading-7 text-g-ink/90">
                      <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-g-accent-3" aria-hidden />
                      {s.tip}
                    </p>
                  )}
                </div>
                {s.shot && (
                  <div className="flex justify-center md:w-[300px] md:shrink-0">
                    <Screenshot id={s.shot} alt={`${t.title} — مرحله ${toPersianDigits(i + 1)}: ${s.title}`} callouts={s.callouts} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <StepToc steps={t.steps} variant="side" />
          </div>
        </aside>
      </div>

      <nav aria-label="راهنمای قبلی و بعدی" className="mt-12 grid gap-4 sm:grid-cols-2">
        {prev ? (
          <Link href={`/tutorials/${prev.slug}`} className="g-glass-soft group flex items-center gap-3 rounded-3xl p-5 transition hover:border-g-accent/35">
            <ArrowRight className="h-5 w-5 shrink-0 text-g-accent transition group-hover:translate-x-1" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-g-faint">راهنمای قبلی</span>
              <span className="mt-0.5 block truncate font-bold text-g-ink">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/tutorials/${next.slug}`} className="g-glass-soft group flex items-center justify-end gap-3 rounded-3xl p-5 text-end transition hover:border-g-accent/35">
            <span className="min-w-0">
              <span className="block text-xs text-g-faint">راهنمای بعدی</span>
              <span className="mt-0.5 block truncate font-bold text-g-ink">{next.title}</span>
            </span>
            <ArrowLeft className="h-5 w-5 shrink-0 text-g-accent transition group-hover:-translate-x-1" aria-hidden />
          </Link>
        )}
      </nav>

      <p className="mt-10 text-center text-sm text-g-muted">
        جواب سؤالتان را پیدا نکردید؟{" "}
        <Link href="/contact" className="font-bold text-g-accent hover:underline">
          با پشتیبانی در تماس باشید
        </Link>
      </p>
    </div>
  );
}
