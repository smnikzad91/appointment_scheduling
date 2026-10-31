"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ListOrdered, Play, Search, SearchX, X } from "lucide-react";
import { TUTORIALS, TUTORIAL_ROLES, type Tutorial, type TutorialRole } from "@/content/tutorials";
import shots from "@/content/tutorialShots.json";
import { toPersianDigits } from "@/lib/persian";
import { ROLE_ICON } from "./roleIcons";
import StoryPlayer, { slidesOf, type Slide } from "./StoryPlayer";
import { PhoneShot } from "./StoryShot";

const SHOTS = shots as Record<string, { w: number; h: number; boxes: { x: number; y: number; w: number; h: number }[] }>;

// Search is client-side over the static list: Arabic ي/ك folded, zero-width non-joiners and
// spaces ignored, so «نوبت‌های من», «نوبتهای من» and «نوبت ها» all match.
const fold = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, "").toLowerCase();
const guideText = (t: Tutorial) => fold([t.title, t.summary, ...t.keywords].join(" "));
const stepText = (t: Tutorial, i: number) => fold([t.steps[i].title, t.steps[i].body, t.steps[i].tip ?? "", ...(t.steps[i].callouts ?? [])].join(" "));

type Filter = "all" | TutorialRole;

/** The highlight circles' names — the same as the Instagram highlights (story-highlights/). */
const PANEL_LABEL: Record<TutorialRole, string> = { owner: "پنل سالن", stylist: "پنل آرایشگر", independent: "آرایشگر مستقل", customer: "پنل مشتری" };

/** `initialRole` comes from ?role=… so panels can deep-link to their own tab. */
export default function TutorialsIndex({ initialRole }: { initialRole?: TutorialRole }) {
  const [filter, setFilter] = useState<Filter>(initialRole ?? "all");
  const [query, setQuery] = useState("");
  const index = useMemo(() => TUTORIALS.map((t) => ({ t, guide: guideText(t), steps: t.steps.map((_, i) => stepText(t, i)) })), []);

  // One card per step: a step matches when every word is in it or in its guide's title/keywords.
  const words = query.trim().split(/\s+/).map(fold).filter(Boolean);
  const matches = index
    .filter(({ t }) => filter === "all" || t.role === filter)
    .map(({ t, guide, steps }) => ({ t, steps: steps.map((text, i) => i).filter((i) => words.every((w) => steps[i].includes(w) || guide.includes(w))) }))
    .filter((g) => g.steps.length);
  const groups = TUTORIAL_ROLES.map((r) => ({ role: r, guides: matches.filter((g) => g.t.role === r.id) })).filter((g) => g.guides.length);
  const total = matches.reduce((n, g) => n + g.steps.length, 0);
  const [story, setStory] = useState<{ slides: Slide[]; start: number } | null>(null);
  const playPanel = (role: TutorialRole) => setStory({ slides: slidesOf(TUTORIALS.filter((t) => t.role === role)), start: 0 });
  const playGuide = (t: Tutorial, step?: number) => setStory({ slides: slidesOf([t]), start: step === undefined ? 0 : step + 1 });

  return (
    <div>
      {/* story highlights: one per panel, like the Instagram page */}
      <div className="g-rise -mx-4 mb-8 flex justify-between gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:justify-start sm:gap-8 sm:px-0" style={{ "--i": 3 } as React.CSSProperties}>
        {TUTORIAL_ROLES.map((r) => {
          const Icon = ROLE_ICON[r.id];
          const guides = TUTORIALS.filter((t) => t.role === r.id);
          const slides = guides.reduce((n, t) => n + t.steps.length + 1, 0);
          return (
            <button key={r.id} type="button" onClick={() => playPanel(r.id)} className="group flex w-[78px] shrink-0 flex-col items-center gap-2 text-center sm:w-[104px]" aria-label={`استوری راهنمای ${r.label}`}>
              <span className="rounded-full bg-[conic-gradient(from_200deg,#efbda0,#c68a72,#9c5e4b,#2b344d,#efbda0)] p-[3px] transition group-hover:scale-105">
                <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-[3px] border-[#121319] bg-[#1e2229] text-[#efbda0] sm:h-[92px] sm:w-[92px]">
                  <Icon className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden />
                </span>
              </span>
              <span className="whitespace-nowrap text-[12px] font-bold leading-5 text-g-ink sm:text-[13px]">{PANEL_LABEL[r.id]}</span>
              <span className="-mt-1.5 text-[11px] text-g-faint">
                <span className="hidden sm:inline">{toPersianDigits(guides.length)} راهنما · </span>
                {toPersianDigits(slides)} اسلاید
              </span>
            </button>
          );
        })}
      </div>

      {/* search + role tabs */}
      <div className="g-rise sticky top-16 z-30 -mx-4 bg-g-bg/70 px-4 pb-4 pt-2 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:px-0" style={{ "--i": 3 } as React.CSSProperties}>
        <label className="relative block">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-g-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در آموزش‌ها… مثلاً «مرخصی» یا «برداشت»"
            aria-label="جستجو در آموزش‌ها"
            className="g-input h-14 !pt-0 !pb-0 pe-11 ps-12 placeholder:!text-g-faint"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-g-faint hover:bg-white/10 hover:text-g-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="نقش">
          {([{ id: "all", short: "همه آموزش‌ها" }, ...TUTORIAL_ROLES.map((r) => ({ id: r.id, short: r.label }))] as { id: Filter; short: string }[]).map((r) => {
            const Icon = r.id === "all" ? ListOrdered : ROLE_ICON[r.id];
            const on = filter === r.id;
            const count = (r.id === "all" ? TUTORIALS : TUTORIALS.filter((t) => t.role === r.id)).reduce((n, t) => n + t.steps.length, 0);
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(r.id)}
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition ${
                  on ? "border-transparent bg-[image:var(--g-gradient)] text-[#121319]" : "border-g-line bg-g-glass-soft text-g-muted hover:border-g-line-strong hover:text-g-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {r.short}
                <span className={`text-xs ${on ? "opacity-70" : "text-g-faint"}`}>{toPersianDigits(count)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-g-muted">
          <SearchX className="h-10 w-10 opacity-50" aria-hidden />
          <p>آموزشی برای «{query}» پیدا نشد.</p>
          <Link href="/contact" className="text-sm font-bold text-g-accent hover:underline">
            از پشتیبانی بپرسید
          </Link>
        </div>
      ) : (
        <>
          {words.length > 0 && <p className="mt-4 text-sm text-g-faint">{toPersianDigits(total)} آموزش پیدا شد</p>}
          {groups.map(({ role, guides }) => {
            const Icon = ROLE_ICON[role.id];
            return (
              <section key={role.id} className="mt-10" aria-labelledby={`role-${role.id}`}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-g-accent/30 bg-g-accent/10 text-g-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 id={`role-${role.id}`} className="text-xl font-black text-g-ink">
                      {role.label}
                    </h2>
                    <p className="text-[13px] text-g-faint">{role.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-8">
                  {guides.map(({ t, steps }) => (
                    <div key={t.slug}>
                      <div className="mb-3 flex items-center justify-between gap-3 border-b border-g-line pb-2.5">
                        <Link href={`/tutorials/${t.slug}`} className="group min-w-0">
                          <span className="block truncate text-[16px] font-black text-g-ink group-hover:text-g-accent">{t.title}</span>
                          <span className="mt-0.5 flex items-center gap-3 text-[12px] text-g-faint">
                            <span className="flex items-center gap-1">
                              <ListOrdered className="h-3.5 w-3.5" aria-hidden />
                              {toPersianDigits(t.steps.length)} مرحله
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {toPersianDigits(t.minutes)} دقیقه
                            </span>
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => playGuide(t)}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(115deg,#efbda0,#c68a72_55%,#9c5e4b)] px-3.5 text-[12px] font-black text-[#121319]"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                          استوری
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {steps.map((i) => (
                          <StepCard key={i} t={t} i={i} onPlay={() => playGuide(t, i)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
      {story && <StoryPlayer slides={story.slides} start={story.start} onClose={() => setStory(null)} />}
    </div>
  );
}

/**
 * Scrolls a card's phone so the step's first frame sits mid-thumbnail. Percentage margins are of the
 * container's width, which the phone fills, so the screen's height is `h / w` of it.
 */
function focusOffset(id: string) {
  const shot = SHOTS[id];
  const box = shot.boxes[0];
  if (!box) return undefined;
  const ratio = (shot.h / shot.w) * 100;
  const centre = ((box.y + box.h / 2) / 100) * ratio;
  return `clamp(calc(-${ratio.toFixed(1)}% + var(--h)), calc(-${centre.toFixed(1)}% + var(--h) / 2), 0px)`;
}

/** One step as a story slide: its screen in a phone (top part), the step badge and title. */
function StepCard({ t, i, onPlay }: { t: Tutorial; i: number; onPlay: () => void }) {
  const s = t.steps[i];
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#121319] bg-[radial-gradient(240px_200px_at_100%_0%,rgb(198_138_114/0.18),transparent_70%)] transition duration-300 hover:-translate-y-1 hover:border-[#c68a72]/50">
      <Link href={`/tutorials/${t.slug}#step-${i + 1}`} className="flex h-full flex-col">
        <span className="relative block h-[var(--h)] overflow-hidden px-4 pt-3 [--h:170px] sm:px-6 sm:[--h:210px]">
          {s.shot && SHOTS[s.shot] ? (
            <span className="block" style={{ marginTop: focusOffset(s.shot) }}>
              <PhoneShot id={s.shot} alt="" callouts={s.callouts} zoomable={false} className="pointer-events-none transition duration-300 group-hover:scale-[1.03]" />
            </span>
          ) : (
            <span className="flex h-full items-center justify-center text-g-faint">
              <ListOrdered className="h-8 w-8" aria-hidden />
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#121319] to-transparent" />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-3 pt-2 sm:p-4 sm:pt-2">
          <span className="self-start rounded-full bg-[linear-gradient(115deg,#efbda0,#c68a72_55%,#9c5e4b)] px-2.5 py-0.5 text-[11px] font-black text-[#121319]">
            مرحله {toPersianDigits(i + 1)} از {toPersianDigits(t.steps.length)}
          </span>
          <span className="line-clamp-2 text-[13.5px] font-bold leading-6 text-g-ink sm:text-[14.5px]">{s.title}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`پخش استوری از این مرحله: ${s.title}`}
        className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-[#c68a72] hover:text-[#121319]"
      >
        <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
      </button>
    </div>
  );
}
