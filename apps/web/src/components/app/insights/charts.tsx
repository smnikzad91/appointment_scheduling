"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";
import { cx } from "../ui";

// Small dependency-free charts for the owner's analytics pages (CSS bars, no chart library):
// they follow the panel's theme tokens in light and dark mode and flow right-to-left with the page.

export const faNum = (n: number) => toPersianDigits(n.toLocaleString("en-US").replace(/,/g, "٬"));
export const faPct = (n: number) => `${toPersianDigits(String(n % 1 ? n.toFixed(1) : n))}٪`;

/** A KPI: big value, label, optional change against the previous window. */
export function Kpi({ label, value, delta, hint, tone = "ink" }: { label: string; value: string; delta?: number | null; hint?: string; tone?: "ink" | "accent" | "danger" }) {
  return (
    <div className="min-w-0 rounded-3xl border border-app-line bg-app-card p-4 shadow-app">
      <p className="text-xs font-medium text-app-muted">{label}</p>
      <p className={cx("mt-1.5 text-[24px] font-black leading-none", tone === "accent" ? "text-app-accent" : tone === "danger" ? "text-app-danger" : "text-app-ink")}>{value}</p>
      {delta !== undefined && delta !== null && <Delta value={delta} className="mt-2" />}
      {hint && <p className="mt-1.5 text-[11px] leading-4 text-app-muted">{hint}</p>}
    </div>
  );
}

/** Percent change chip; `invert` when lower is better. */
export function Delta({ value, invert, className }: { value: number; invert?: boolean; className?: string }) {
  const good = invert ? value < 0 : value > 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  if (value === 0) return <span className={cx("text-[11px] text-app-muted", className)}>بدون تغییر</span>;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", good ? "bg-app-done/12 text-app-done" : "bg-app-danger/12 text-app-danger", className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {faPct(Math.abs(value))}
      <span className="font-normal opacity-80">نسبت به دوره قبل</span>
    </span>
  );
}

/** Percent change from `before` to `now`; null when there's nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Vertical bars with labels under some of them. */
export function Bars({
  values,
  labels,
  highlight,
  height = 120,
  format = faNum,
  labelEvery = 1,
}: {
  values: number[];
  labels: string[];
  /** index drawn in the accent colour (e.g. today) */
  highlight?: number;
  height?: number;
  format?: (n: number) => string;
  labelEvery?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={labels.map((l, i) => `${l}: ${format(values[i])}`).join("، ")}>
        {values.map((v, i) => (
          <div key={i} className="group relative flex h-full min-w-0 flex-1 items-end">
            <div
              className={cx("w-full rounded-t-md transition-all", i === highlight ? "bg-app-accent" : v ? "bg-app-accent/45" : "bg-app-card-2")}
              style={{ height: v ? `${Math.max(4, (v / max) * 100)}%` : 3 }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-app-ink px-1.5 py-0.5 text-[10px] font-bold text-app-bg group-hover:block">
              {format(v)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {labels.map((l, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-app-muted">
            {i % labelEvery === 0 ? l : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal share bars: label, value, a bar against the biggest row. */
export function Meters({ rows, format = faNum, empty = "داده‌ای نیست" }: { rows: { key: string; label: string; value: number; sub?: string }[]; format?: (n: number) => string; empty?: string }) {
  if (!rows.length) return <p className="py-3 text-center text-sm text-app-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-app-ink">{r.label}</span>
            <span className="shrink-0 text-app-muted">
              {format(r.value)}
              {r.sub && <span className="ms-1.5 text-[11px]">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-app-card-2">
            <div className="h-full rounded-full bg-app-accent" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Weekday × hour heat map (rows Saturday-first), only the hours that had any booking. */
export function Heatmap({ grid, days }: { grid: number[][]; days: string[] }) {
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => grid.some((row) => row[h] > 0));
  if (!hours.length) return <p className="py-3 text-center text-sm text-app-muted">هنوز نوبتی در این بازه نیست</p>;
  const from = hours[0];
  const to = hours[hours.length - 1];
  const span = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <table className="w-full border-separate border-spacing-[3px] text-[10px]">
        <thead>
          <tr>
            <th />
            {span.map((h) => (
              <th key={h} className="font-normal text-app-muted">{toPersianDigits(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, w) => (
            <tr key={w}>
              <th className="whitespace-nowrap pe-1 text-start font-semibold text-app-muted">{days[w]}</th>
              {span.map((h) => {
                const v = row[h];
                return (
                  <td
                    key={h}
                    title={`${days[w]} ساعت ${toPersianDigits(h)}: ${toPersianDigits(v)} نوبت`}
                    className="h-6 min-w-[18px] rounded-md"
                    style={{ background: v ? `color-mix(in srgb, var(--app-accent) ${15 + (v / max) * 85}%, transparent)` : "var(--app-card-2)" }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Range chips (7 / 30 / 90 days…). */
export function RangeTabs<T extends number>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  const label = (d: number) => (d === 7 ? "۷ روز" : d === 30 ? "۳۰ روز" : d === 90 ? "۳ ماه" : d === 365 ? "یک سال" : `${toPersianDigits(d)} روز`);
  return (
    <div className="inline-flex rounded-2xl border border-app-line bg-app-card p-1" role="tablist">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          role="tab"
          aria-selected={d === value}
          onClick={() => onChange(d)}
          className={cx("h-9 rounded-xl px-3.5 text-sm font-semibold transition", d === value ? "bg-app-ink text-app-bg" : "text-app-muted")}
        >
          {label(d)}
        </button>
      ))}
    </div>
  );
}

/** A titled card section of an analytics page. */
export function Panel({ title, hint, action, children, className }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-3xl border border-app-line bg-app-card p-4 shadow-app sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-app-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-xs leading-5 text-app-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
