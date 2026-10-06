"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { formatMinutesAsClock } from "@/lib/persian";
import Sheet from "./Sheet";
import { cx } from "./ui";

// Start-time picker for bookings made by the salon or a stylist: a big trigger that opens a
// bottom sheet of time chips grouped by part of day, instead of a native <select> (unstylable,
// and a 72-row wheel). Free slots are marked; any time can still be chosen (walk-ins).

/** ۲۴:۰۰ reads as a closing time; formatMinutesAsClock would wrap it to ۰۰:۰۰. */
const clock = (m: number) => (m === 24 * 60 ? "۲۴:۰۰" : formatMinutesAsClock(m));

const PERIODS = [
  { label: "صبح", from: 0, to: 12 * 60 },
  { label: "ظهر", from: 12 * 60, to: 16 * 60 },
  { label: "عصر", from: 16 * 60, to: 20 * 60 },
  { label: "شب", from: 20 * 60, to: 24 * 60 + 1 }, // includes ۲۴:۰۰ as a closing time
];

export default function TimePicker({
  value,
  onChange,
  options,
  free,
  label = "ساعت شروع",
  hint,
  compact,
}: {
  /** Minutes after midnight, salon-local. */
  value: number;
  onChange: (minute: number) => void;
  options: number[];
  /** Minutes known to be free for the chosen stylist/services; null while unknown. */
  free: number[] | null;
  label?: string;
  /** Shown above the grid once free slots are known (explains the green chips). */
  hint?: string;
  /** Small trigger for side-by-side fields (working hours); no badge or «تغییر». */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const freeSet = new Set(free ?? []);
  const all = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${label}: ${clock(value)}`}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-app-line bg-app-card px-3 font-bold text-app-ink transition active:scale-[0.98]"
        >
          <Clock className="h-4 w-4 shrink-0 text-app-accent" aria-hidden />
          {clock(value)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${label}: ${clock(value)}`}
          className="flex h-14 w-full items-center gap-3 rounded-2xl border border-app-line bg-app-card px-4 text-app-ink transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
            <Clock className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="flex-1 text-start text-xl font-black tracking-wide">{clock(value)}</span>
          {freeSet.has(value) && <span className="rounded-full bg-app-done/15 px-2 py-0.5 text-[11px] font-bold text-app-done">خالی</span>}
          <span className="text-xs text-app-muted">تغییر</span>
          <ChevronDown className="h-4 w-4 text-app-muted" aria-hidden />
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <TimeGrid
          all={all}
          value={value}
          freeSet={freeSet}
          hasFree={!!free && free.length > 0}
          hint={hint}
          onPick={(m) => {
            onChange(m);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function TimeGrid({
  all,
  value,
  freeSet,
  hasFree,
  hint,
  onPick,
}: {
  all: number[];
  value: number;
  freeSet: Set<number>;
  hasFree: boolean;
  hint?: string;
  onPick: (m: number) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [onlyFree, setOnlyFree] = useState(false);
  // Open on the current choice, not at 06:00.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const shown = onlyFree ? all.filter((m) => freeSet.has(m)) : all;

  return (
    <div className="flex flex-col gap-5">
      {hasFree && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hint && <p className="text-xs leading-6 text-app-muted">{hint}</p>}
          <div className="flex rounded-full border border-app-line bg-app-card p-0.5 text-[13px] font-bold" role="tablist">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                role="tab"
                aria-selected={onlyFree === v}
                onClick={() => setOnlyFree(v)}
                className={cx("h-8 rounded-full px-3 transition", onlyFree === v ? "bg-app-ink text-app-bg" : "text-app-muted")}
              >
                {v ? "فقط خالی‌ها" : "همه ساعت‌ها"}
              </button>
            ))}
          </div>
        </div>
      )}

      {PERIODS.map((p) => {
        const items = shown.filter((m) => m >= p.from && m < p.to);
        if (!items.length) return null;
        return (
          <section key={p.label}>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-[13px] font-bold text-app-muted">
              {p.label}
              <span className="h-px flex-1 bg-app-line" />
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {items.map((m) => {
                const selected = m === value;
                const isFree = freeSet.has(m);
                return (
                  <button
                    key={m}
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    onClick={() => onPick(m)}
                    aria-pressed={selected}
                    className={cx(
                      "relative h-11 rounded-xl text-[15px] font-bold transition active:scale-95",
                      selected
                        ? "bg-app-accent text-app-accent-ink shadow-[0_8px_20px_-8px_var(--app-accent)]"
                        : isFree
                          ? "border border-app-done/40 bg-app-done/10 text-app-ink"
                          : "border border-app-line bg-app-card text-app-muted",
                    )}
                  >
                    {clock(m)}
                    {isFree && !selected && <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-app-done" aria-label="خالی" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {shown.length === 0 && <p className="py-8 text-center text-sm text-app-muted">ساعت خالی‌ای برای این روز نیست.</p>}
    </div>
  );
}
