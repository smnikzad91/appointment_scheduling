"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ListOrdered, Play, Search, SearchX, X } from "lucide-react";
import { TUTORIALS, TUTORIAL_ROLES, type Tutorial, type TutorialRole } from "@/content/tutorials";
import shots from "@/content/tutorialShots.json";
import { toPersianDigits } from "@/lib/persian";
import { ROLE_ICON } from "./roleIcons";
import StoryPlayer, { slidesOf, type Slide } from "./StoryPlayer";
import { PhoneShot } from "./StoryShot";

const SHOTS = shots as Record<string, { w: number; h: number }>;

// Search is client-side over the static list: Arabic ي/ك folded, zero-width non-joiners and
// spaces ignored, so «نوبت‌های من», «نوبتهای من» and «نوبت ها» all match.
const fold = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, "").toLowerCase();
const haystack = (t: Tutorial) => fold([t.title, t.summary, ...t.keywords, ...t.steps.map((s) => `${s.title} ${s.body}`)].join(" "));

type Filter = "all" | TutorialRole;

/** The highlight circles' names — the same as the Instagram highlights (story-highlights/). */
const PANEL_LABEL: Record<TutorialRole, string> = { owner: "پنل سالن", stylist: "پنل آرایشگر", independent: "آرایشگر مستقل", customer: "پنل مشتری" };

/** `initialRole` comes from ?role=… so panels can deep-link to their own tab. */
export default function TutorialsIndex({ initialRole }: { initialRole?: TutorialRole }) {
  const [filter, setFilter] = useState<Filter>(initialRole ?? "all");
  const [query, setQuery] = useState("");
  const index = useMemo(() => TUTORIALS.map((t) => ({ t, text: haystack(t) })), []);

  const q = fold(query);
  const words = query.trim().split(/\s+/).map(fold).filter(Boolean);
  const matches = index
    .filter(({ t }) => filter === "all" || t.role === filter)
    .filter(({ text }) => !q || words.every((w) => text.includes(w)))
    .map(({ t }) => t);
  const groups = TUTORIAL_ROLES.map((r) => ({ role: r, items: matches.filter((t) => t.role === r.id) })).filter((g) => g.items.length);
  const [story, setStory] = useState<{ slides: Slide[]; start: number } | null>(null);
  const playPanel = (role: TutorialRole) => setStory({ slides: slidesOf(TUTORIALS.filter((t) => t.role === role)), start: 0 });
  const playGuide = (t: Tutorial) => setStory({ slides: slidesOf([t]), start: 0 });

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
            placeholder="جستجو در راهنماها… مثلاً «مرخصی» یا «لینک فعال‌سازی»"
            aria-label="جستجو در راهنماها"
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
          {([{ id: "all", short: "همه راهنماها" }, ...TUTORIAL_ROLES.map((r) => ({ id: r.id, short: r.label }))] as { id: Filter; short: string }[]).map((r) => {
            const Icon = r.id === "all" ? ListOrdered : ROLE_ICON[r.id];
            const on = filter === r.id;
            const count = r.id === "all" ? TUTORIALS.length : TUTORIALS.filter((t) => t.role === r.id).length;
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
          <p>راهنمایی برای «{query}» پیدا نشد.</p>
          <Link href="/contact" className="text-sm font-bold text-g-accent hover:underline">
            از پشتیبانی بپرسید
          </Link>
        </div>
      ) : (
        groups.map(({ role, items }) => {
          const Icon = ROLE_ICON[role.id];
          return (
            <section key={role.id} className="mt-8" aria-labelledby={`role-${role.id}`}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <TutorialCard key={t.slug} t={t} onPlay={() => playGuide(t)} />
                ))}
              </div>
            </section>
          );
        })
      )}
      {story && <StoryPlayer slides={story.slides} start={story.start} onClose={() => setStory(null)} />}
    </div>
  );
}

/** A guide as its story cover: title, the first steps as numbered rows, and the cover screen in a phone. */
function TutorialCard({ t, onPlay }: { t: Tutorial; onPlay: () => void }) {
  const cover = t.steps.find((s) => s.shot)?.shot;
  const shown = t.steps.slice(0, 3);
  return (
    <div className="g-glass-soft group relative flex overflow-hidden rounded-[28px] transition duration-300 hover:-translate-y-1 hover:border-g-accent/35">
      <Link href={`/tutorials/${t.slug}`} className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <span className="flex items-center gap-2 text-[11px] font-bold text-g-faint">
          <span className="flex items-center gap-1">
            <ListOrdered className="h-3.5 w-3.5" aria-hidden />
            {toPersianDigits(t.steps.length)} مرحله
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {toPersianDigits(t.minutes)} دقیقه
          </span>
        </span>
        <span className="text-[16px] font-black leading-7 text-g-ink">{t.title}</span>
        <ol className="flex flex-col gap-1.5">
          {shown.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px] leading-5 text-g-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#35292a] text-[10px] font-black text-[#efbda0]">{toPersianDigits(i + 1)}</span>
              <span className="truncate">{s.title}</span>
            </li>
          ))}
          {t.steps.length > shown.length && <li className="pr-7 text-[11.5px] text-g-faint">و {toPersianDigits(t.steps.length - shown.length)} مرحله دیگر…</li>}
        </ol>
        <span className="mt-auto flex items-center gap-1 pt-1 text-[13px] font-bold text-g-accent">
          خواندن راهنما
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" aria-hidden />
        </span>
      </Link>
      {cover && SHOTS[cover] && (
        <button type="button" onClick={onPlay} className="relative w-[112px] shrink-0 overflow-hidden border-r border-g-line bg-[#171a20] px-2.5 pt-4" aria-label={`پخش استوری: ${t.title}`}>
          <PhoneShot id={cover} alt="" zoomable={false} className="pointer-events-none origin-top transition duration-300 group-hover:scale-[1.03]" />
          <span className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-1 rounded-full bg-[linear-gradient(115deg,#efbda0,#c68a72_55%,#9c5e4b)] px-2.5 py-1 text-[11px] font-black text-[#121319] shadow-lg">
            <Play className="h-3 w-3 fill-current" aria-hidden />
            استوری
          </span>
        </button>
      )}
    </div>
  );
}
