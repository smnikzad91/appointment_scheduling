import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, Clock, Lightbulb, ListOrdered } from "lucide-react";
import { TUTORIALS, TUTORIAL_ROLES, neighbours, tutorialBySlug } from "@/content/tutorials";
import { ShotWithNotes } from "@/components/tutorials/StoryShot";
import GuideStoryButton from "@/components/tutorials/GuideStoryButton";
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

      {/* the guide's cover, like the first slide of its story */}
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div>
          <span className="g-kicker g-rise" style={rise(1)}>
            <RoleIcon className="h-3.5 w-3.5" aria-hidden />
            {role.label}
          </span>
          <h1 className="g-rise mt-4 text-3xl font-black leading-snug text-g-ink sm:text-[44px] sm:leading-[1.3]" style={rise(2)}>
            {t.title}
          </h1>
          <p className="g-rise mt-4 text-[15px] leading-8 text-[#d8ccc6]" style={rise(3)}>
            {t.summary}
          </p>
          <div className="g-rise mt-6 flex flex-wrap items-center gap-4" style={rise(4)}>
            <GuideStoryButton slug={t.slug} />
            <span className="flex items-center gap-4 text-sm font-bold text-g-faint">
              <span className="flex items-center gap-1.5">
                <ListOrdered className="h-4 w-4" aria-hidden />
                {toPersianDigits(t.steps.length)} مرحله
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden />
                حدود {toPersianDigits(t.minutes)} دقیقه
              </span>
            </span>
          </div>
        </div>
        <ol className="g-rise flex flex-col gap-2" style={rise(4)} aria-label="مراحل این راهنما">
          {t.steps.map((s, i) => (
            <li key={i}>
              <a
                href={`#step-${i + 1}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1d1520]/90 px-3.5 py-3 text-[14px] font-bold text-g-ink transition hover:border-[#f2876a]/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#35292a] text-[13px] font-black text-[#f6b46b]">{toPersianDigits(i + 1)}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </header>

      {/* phones: sticky step chips under the site header */}
      <div className="sticky top-16 z-30 -mx-4 mt-8 border-y border-g-line bg-g-bg/75 px-4 backdrop-blur-xl lg:hidden">
        <StepToc steps={t.steps} variant="strip" />
      </div>

      {/* one "slide" per step: badge and title, the phone with its captions, then the text */}
      <ol className="mx-auto mt-10 flex max-w-4xl flex-col gap-8">
        {t.steps.map((s, i) => (
          <li key={i} id={`step-${i + 1}`} className="g-reveal scroll-mt-36 overflow-hidden rounded-[32px] border border-white/10 bg-[#0c090e] bg-[radial-gradient(520px_380px_at_100%_0%,rgb(198_138_114/0.16),transparent_70%),radial-gradient(520px_380px_at_0%_100%,rgb(43_52_77/0.6),transparent_70%)] p-5 sm:p-8 lg:scroll-mt-24">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-g-faint">
              <span className="rounded-full bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)] px-3.5 py-1 text-[#1a0f14]">
                مرحله {toPersianDigits(i + 1)} از {toPersianDigits(t.steps.length)}
              </span>
              <span className="truncate">{t.title}</span>
            </div>
            <h2 className="mt-3 text-[22px] font-black leading-9 text-g-ink sm:text-[28px] sm:leading-[1.4]">{s.title}</h2>
            {s.shot && (
              <div className="mt-6">
                <ShotWithNotes id={s.shot} alt={`${t.title} — مرحله ${toPersianDigits(i + 1)}: ${s.title}`} callouts={s.callouts} />
              </div>
            )}
            <p className="mx-auto mt-7 max-w-[640px] text-[16px] leading-9 text-g-ink/90">{s.body}</p>
            {s.tip && (
              <p className="mx-auto mt-4 flex max-w-[640px] gap-2.5 rounded-2xl border border-[#f6b46b]/25 bg-[#f6b46b]/[0.07] p-4 text-[14px] font-bold leading-7 text-[#f6b46b]">
                <Lightbulb className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                {s.tip}
              </p>
            )}
          </li>
        ))}
      </ol>

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
