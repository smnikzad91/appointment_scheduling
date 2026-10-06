"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, ListOrdered, Search, SearchX, X } from "lucide-react";
import { TUTORIALS, TUTORIAL_ROLES, type Tutorial, type TutorialRole } from "@/content/tutorials";
import shots from "@/content/tutorialShots.json";
import { toPersianDigits } from "@/lib/persian";
import { ROLE_ICON } from "./roleIcons";

const SHOTS = shots as Record<string, { w: number; h: number }>;

// Search is client-side over the static list: Arabic ي/ك folded, zero-width non-joiners and
// spaces ignored, so «نوبت‌های من», «نوبتهای من» and «نوبت ها» all match.
const fold = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌\s]+/g, "").toLowerCase();
const haystack = (t: Tutorial) => fold([t.title, t.summary, ...t.keywords, ...t.steps.map((s) => `${s.title} ${s.body}`)].join(" "));

type Filter = "all" | TutorialRole;

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

  return (
    <div>
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
                  on ? "border-transparent bg-[image:var(--g-gradient)] text-[#1a0f14]" : "border-g-line bg-g-glass-soft text-g-muted hover:border-g-line-strong hover:text-g-ink"
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
                  <TutorialCard key={t.slug} t={t} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function TutorialCard({ t }: { t: Tutorial }) {
  const cover = t.steps.find((s) => s.shot)?.shot;
  return (
    <Link
      href={`/tutorials/${t.slug}`}
      className="g-glass-soft group flex overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:border-g-accent/35 hover:bg-white/[0.05]"
    >
      {cover && SHOTS[cover] && (
        <span className="relative w-[96px] shrink-0 overflow-hidden border-l border-g-line bg-g-bg-2">
          <Image src={`/tutorials/${cover}.webp`} alt="" width={SHOTS[cover].w} height={SHOTS[cover].h} sizes="96px" className="h-full w-full object-cover object-top opacity-80 transition group-hover:opacity-100" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col p-4">
        <span className="font-bold leading-7 text-g-ink">{t.title}</span>
        <span className="mt-1 line-clamp-2 text-[13px] leading-6 text-g-muted">{t.summary}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-g-faint">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ListOrdered className="h-3.5 w-3.5" aria-hidden />
              {toPersianDigits(t.steps.length)} مرحله
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {toPersianDigits(t.minutes)} دقیقه
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 text-g-accent transition group-hover:-translate-x-1" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
