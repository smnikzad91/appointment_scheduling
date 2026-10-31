"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";
import { cx } from "./ui";

export interface TourStep {
  /** `data-tour` value of the element to spotlight; none (or not on the page) → a centred card. */
  target?: string;
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

function measure(target: string | undefined): Box | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/**
 * Spotlight overlay: dims the page around the current step's element, with a caption card beside it.
 * Mount it only while open, so every run starts at the first step.
 */
export default function PanelTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  useLayoutEffect(() => {
    const update = () => setBox(measure(step?.target));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [step?.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: left moves forward.
      else if (e.key === "ArrowLeft") {
        if (last) onClose();
        else setIndex((i) => i + 1);
      }
      else if (e.key === "ArrowRight") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  if (!step || typeof document === "undefined") return null;

  // Card goes on the roomier side of the spotlight; centred when there is none.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = box ? box.top + box.height / 2 < vh / 2 : false;
  const cardPos: React.CSSProperties = !box
    ? { top: "50%", transform: "translateY(-50%)" }
    : below
      ? { top: box.top + box.height + 14 }
      : { bottom: vh - box.top + 14 };

  return createPortal(
    // Inline background: .app-root's own (unlayered) paper background would otherwise hide the page.
    <div dir="rtl" className="app-root fixed inset-0 z-[100001]" style={{ background: "transparent" }} role="dialog" aria-modal="true" aria-label="تور آشنایی">
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-app-accent transition-all duration-300 ease-out"
          style={{ ...box, boxShadow: "0 0 0 9999px rgb(8 10 16 / 0.68)" }}
        />
      ) : (
        <div aria-hidden className="app-fade-in absolute inset-0 bg-[rgb(8_10_16/0.68)]" />
      )}

      <div className="absolute inset-x-4 mx-auto max-w-sm transition-all duration-300 ease-out" style={cardPos}>
        <div key={index} className="app-rise rounded-3xl border border-app-line bg-app-card p-5 shadow-[0_18px_50px_-14px_rgb(0_0_0/0.55)]">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-black leading-snug text-app-ink">{step.title}</h2>
            <button type="button" onClick={onClose} aria-label="بستن تور" className="-m-1.5 shrink-0 rounded-full p-1.5 text-app-muted active:bg-app-card-2">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="text-[14px] leading-7 text-app-muted">{step.body}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-label={`مرحله ${toPersianDigits(index + 1)} از ${toPersianDigits(steps.length)}`}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cx("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-app-accent" : "w-1.5 bg-app-line")}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => setIndex((i) => i - 1)}
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
                onClick={() => (last ? onClose() : setIndex((i) => i + 1))}
                className="flex h-10 items-center gap-1 rounded-full bg-app-accent px-5 text-sm font-bold text-app-accent-ink active:scale-95"
              >
                {last ? "شروع کنیم" : index === 0 ? "بزن بریم" : "بعدی"}
                {!last && <ChevronLeft className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
