"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";

export interface TourStep {
  /** Page to open first (a path inside the same panel); none → stay where the tour is. */
  path?: string;
  /** `data-tour` value of the element to spotlight. */
  target?: string;
  /** Or any CSS selector (an aria-label, a link's href) when the element has no `data-tour`. */
  selector?: string;
  /** Skip the step when its element never shows (e.g. a card only some accounts have). */
  optional?: boolean;
  title: string;
  body: string;
}

const doneKey = (id: string) => `tour-done:${id}`;

/**
 * First-run guided tour of a panel: opens by itself the first time this browser shows the panel to
 * an account (remembered per panel and account in localStorage — a convenience, so a blocked storage
 * just means no auto-start), and again whenever `start()` is called (the account sheet's «تور آشنایی»).
 * `id` is null until both the panel and the account are known.
 */
export function usePanelTour(id: string | null) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!id) return;
    let seen = true;
    try {
      seen = localStorage.getItem(doneKey(id)) === "1";
    } catch {}
    if (seen) return;
    // Let the shell and the first screen settle before measuring targets.
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [id]);
  const close = useCallback(() => {
    setOpen(false);
    if (!id) return;
    try {
      localStorage.setItem(doneKey(id), "1");
    } catch {}
  }, [id]);
  return { open, start: useCallback(() => setOpen(true), []), close };
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
/** Rough height of the caption card, to decide whether it fits above or below the spotlight. */
const CARD_H = 250;
/** How long to wait for a step's element (the page may still be loading its data). */
const SEEK_MS = 6000;

function findTarget(step: TourStep): HTMLElement | null {
  const selector = step.target ? `[data-tour="${CSS.escape(step.target)}"]` : step.selector;
  if (!selector) return null;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/**
 * Spotlight overlay: walks through the panel's pages (opening each step's `path`), waits for the
 * step's element, scrolls it into view and dims everything around it, with a caption card on the
 * roomier side. Mount it only while open, so every run starts at the first step.
 */
export default function PanelTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  // null while looking for the step's element; then its box, or "none" for a centred card.
  const [box, setBox] = useState<Box | "none" | null>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const step = steps[index];
  const last = index >= steps.length - 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1 && index >= steps.length - 1) return onClose();
      setDir(delta);
      setBox(null);
      setIndex((i) => Math.max(0, i + delta));
    },
    [index, steps.length, onClose],
  );

  useEffect(() => {
    if (!step) return;
    elRef.current = null;
    if (step.path && window.location.pathname !== step.path) router.push(step.path);
    const started = Date.now();
    let timer = 0;
    let frame = 0;
    const settle = (el: HTMLElement) => {
      elRef.current = el;
      // App bar and tab bar never scroll; anything else is brought to the middle of the screen.
      if (!el.closest("header, nav")) el.scrollIntoView({ block: "center", behavior: "smooth" });
      // Follow it while the page's entrance animation and the scroll finish.
      const until = Date.now() + 900;
      const follow = () => {
        setBox(boxOf(el));
        if (Date.now() < until) frame = requestAnimationFrame(follow);
      };
      follow();
    };
    const seek = () => {
      const onPage = !step.path || window.location.pathname === step.path;
      const el = onPage && (step.target || step.selector) ? findTarget(step) : null;
      if (el) return settle(el);
      if (onPage && !step.target && !step.selector) return setBox("none");
      if (Date.now() - started < SEEK_MS) {
        timer = window.setTimeout(seek, 150);
        return;
      }
      if (step.optional) {
        if (dir === 1 && index >= steps.length - 1) onClose();
        else setIndex((i) => Math.max(0, i + dir));
      } else setBox("none");
    };
    timer = window.setTimeout(seek, 0);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // Re-run per step only; dir/onClose are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const update = () => elRef.current && setBox(boxOf(elRef.current));
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: left moves forward.
      else if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight" && index > 0) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  if (!step || typeof document === "undefined") return null;

  // Card below the spotlight if it fits, else above, else pinned to the bottom over the page.
  const vh = window.innerHeight;
  const spot = box && box !== "none" ? box : null;
  const cardPos: React.CSSProperties = !spot
    ? { top: "50%", transform: "translateY(-50%)" }
    : vh - (spot.top + spot.height) >= CARD_H + 20
      ? { top: spot.top + spot.height + 14 }
      : spot.top >= CARD_H + 20
        ? { bottom: vh - spot.top + 14 }
        : { bottom: "calc(16px + env(safe-area-inset-bottom))" };
  const progress = `${toPersianDigits(index + 1)} از ${toPersianDigits(steps.length)}`;

  return createPortal(
    // Inline background: .app-root's own (unlayered) paper background would otherwise hide the page.
    <div dir="rtl" className="app-root fixed inset-0 z-[100001]" style={{ background: "transparent" }} role="dialog" aria-modal="true" aria-label="تور آشنایی">
      {spot ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-app-accent transition-all duration-300 ease-out"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgb(8 10 16 / 0.68)" }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgb(8_10_16/0.68)]" />
      )}

      {box && (
        <div className="absolute inset-x-4 mx-auto max-w-sm" style={cardPos}>
          <div key={index} className="app-rise rounded-3xl border border-app-line bg-app-card p-5 shadow-[0_18px_50px_-14px_rgb(0_0_0/0.55)]">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-[17px] font-black leading-snug text-app-ink">{step.title}</h2>
              <button type="button" onClick={onClose} aria-label="بستن تور" className="-m-1.5 shrink-0 rounded-full p-1.5 text-app-muted active:bg-app-card-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className="text-[14px] leading-7 text-app-muted">{step.body}</p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5" aria-label={`مرحله ${progress}`}>
                <span className="text-xs font-bold text-app-muted">{progress}</span>
                <span className="h-1 overflow-hidden rounded-full bg-app-line">
                  <span className="block h-full rounded-full bg-app-accent transition-all duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="قبلی"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-app-line text-app-ink active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                ) : (
                  <button type="button" onClick={onClose} className="h-10 px-3 text-sm font-semibold text-app-muted active:opacity-70">
                    رد کردن
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="flex h-10 items-center gap-1 rounded-full bg-app-accent px-5 text-sm font-bold text-app-accent-ink active:scale-95"
                >
                  {last ? "شروع کنیم" : index === 0 ? "بزن بریم" : "بعدی"}
                  {!last && <ChevronLeft className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
