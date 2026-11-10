"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Lightbulb, X } from "lucide-react";
import { TUTORIAL_ROLES, type Tutorial } from "@/content/tutorials";
import { toPersianDigits } from "@/lib/persian";
import { Num, PhoneShot, hasShot } from "./StoryShot";

/** One slide: a guide's cover, or one of its steps (the Instagram highlights' sequence). */
export type Slide = { t: Tutorial; step: number | null };

export const slidesOf = (guides: Tutorial[]): Slide[] =>
  guides.flatMap((t) => [{ t, step: null }, ...t.steps.map((_, i) => ({ t, step: i }))]);

/**
 * Full-screen story player for the Help Center: the guide's cover, then one slide per step with its
 * screenshot, highlight frames and captions. Tap the left half (or ←, or swipe) for the next slide,
 * the right half for the previous one; segments at the top show the place in the current guide.
 */
export default function StoryPlayer({ slides, start = 0, onClose }: { slides: Slide[]; start?: number; onClose: () => void }) {
  const [at, setAt] = useState(start);
  const touch = useRef<number | null>(null);
  const slide = slides[at];
  const next = useCallback(() => (at < slides.length - 1 ? setAt(at + 1) : onClose()), [at, slides.length, onClose]);
  const prev = useCallback(() => setAt((a) => Math.max(0, a - 1)), []);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" || e.key === " ") next();
      if (e.key === "ArrowRight") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
    };
  }, [next, prev, onClose]);

  if (!slide) return null;
  const { t, step } = slide;
  const role = TUTORIAL_ROLES.find((r) => r.id === t.role)!;
  // segments: this guide's slides (cover + steps)
  const first = slides.findIndex((s) => s.t.slug === t.slug);
  const count = t.steps.length + 1;
  const pos = at - first;
  const guides = [...new Set(slides.map((s) => s.t.slug))];
  const guideNo = guides.indexOf(t.slug) + 1;

  return createPortal(
    <div
      className="guest-root fixed inset-0 z-[100000] flex justify-center bg-[#0b0c10]/95 backdrop-blur-md motion-safe:animate-[app-fade-in_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={`راهنما: ${t.title}`}
      dir="rtl"
    >
      <div
        className="relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-[#0c090e] bg-[radial-gradient(520px_420px_at_100%_0%,rgb(198_138_114/0.22),transparent_70%),radial-gradient(480px_380px_at_0%_100%,rgb(43_52_77/0.75),transparent_70%)] sm:my-4 sm:h-[calc(100dvh-2rem)] sm:rounded-[32px] sm:border sm:border-white/10"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (dx > 50) next(); // RTL: swiping right brings the next slide
          else if (dx < -50) prev();
        }}
      >
        {/* progress + header */}
        <div className="relative z-20 px-4 pt-3">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
                <span className={`block h-full rounded-full bg-[#f6b46b] transition-all duration-300 ${i <= pos ? "w-full" : "w-0"}`} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo/nobatet-symbol-v2.png" alt="" className="h-8 w-8 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[13px] font-black text-[#f6b46b]">نوبتت · {role.label}</span>
                <span className="block truncate text-[11px] text-g-faint">
                  راهنمای {toPersianDigits(guideNo)} از {toPersianDigits(guides.length)}
                </span>
              </span>
            </div>
            <button type="button" onClick={onClose} aria-label="بستن" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* slide */}
        {/* tap: left two thirds = next, right third = previous (RTL) */}
        <div
          key={at}
          className="relative z-10 flex min-h-0 flex-1 cursor-pointer select-none flex-col px-5 pb-4 pt-4 motion-safe:animate-[app-fade-in_0.25s_ease-out]"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) return;
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left > (r.width * 2) / 3) prev();
            else next();
          }}
        >
          {step === null ? <Cover t={t} roleLabel={role.label} /> : <StepSlide t={t} i={step} />}
        </div>

        <div className="relative z-20 flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={prev} disabled={at === 0} className="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-g-muted hover:text-g-ink disabled:opacity-30">
            <ChevronRight className="h-4 w-4" aria-hidden />
            قبلی
          </button>
          <Link href={`/tutorials/${t.slug}${step === null ? "" : `#step-${step + 1}`}`} onClick={onClose} className="truncate text-[12px] text-g-faint hover:text-g-ink" dir="ltr">
            <b className="text-[#f2876a]">nobatet.app</b>/tutorials/{t.slug}
          </Link>
          <button type="button" onClick={next} className="flex h-10 items-center gap-1 rounded-full bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)] px-4 text-sm font-black text-[#1a0f14]">
            {at === slides.length - 1 ? "پایان" : "بعدی"}
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Cover({ t, roleLabel }: { t: Tutorial; roleLabel: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-y-auto">
      <span className="self-start rounded-full bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)] px-4 py-1.5 text-[13px] font-black text-[#1a0f14]">{roleLabel}</span>
      <h2 className="text-[30px] font-black leading-[1.35] text-g-ink">{t.title}</h2>
      <p className="text-[15px] leading-8 text-[#d8ccc6]">{t.summary}</p>
      <ol className="flex flex-col gap-2">
        {t.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1d1520] px-3 py-2.5 text-[14px] font-bold text-g-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#35292a] text-[12px] font-black text-[#f6b46b]">{toPersianDigits(i + 1)}</span>
            {s.title}
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-g-faint">
        <Clock className="h-4 w-4" aria-hidden />
        {toPersianDigits(t.minutes)} دقیقه · {toPersianDigits(t.steps.length)} مرحله
      </p>
    </div>
  );
}

function StepSlide({ t, i }: { t: Tutorial; i: number }) {
  const s = t.steps[i];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <p className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-g-faint">
          <span className="shrink-0 rounded-full bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)] px-3 py-0.5 text-[#1a0f14]">
            مرحله {toPersianDigits(i + 1)} از {toPersianDigits(t.steps.length)}
          </span>
          <span className="truncate">{t.title}</span>
        </p>
        <h2 className="mt-2 text-[21px] font-black leading-8 text-g-ink">{s.title}</h2>
      </div>
      {hasShot(s.shot) && (
        <div className="flex min-h-0 flex-1 items-start justify-center gap-3 overflow-hidden">
          {/* a fixed share of the width; a tall screen is cut at the bottom, like the Instagram slides */}
          <div className="max-h-full w-[56%] shrink-0 self-stretch overflow-hidden rounded-[34px]">
            <PhoneShot id={s.shot!} alt={s.title} callouts={s.callouts} zoomable={false} />
          </div>
          {s.callouts && s.callouts.length > 0 && (
            <ol className="flex min-w-0 flex-1 flex-col gap-2 self-center">
              {s.callouts.map((c, k) => (
                <li key={k} className="flex items-center gap-2 rounded-xl border-2 border-[#f2876a]/80 bg-[#1d1520] p-2 text-[12px] font-bold leading-5 text-g-ink">
                  <Num n={k + 1} className="h-6 w-6 text-[11px]" />
                  {c}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <div className="max-h-[30%] shrink-0 overflow-y-auto">
        <p className="text-[14px] leading-7 text-g-ink/90">{s.body}</p>
        {s.tip && (
          <p className="mt-2 flex gap-2 text-[12.5px] font-bold leading-6 text-[#f6b46b]">
            <Lightbulb className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            {s.tip}
          </p>
        )}
      </div>
    </div>
  );
}
