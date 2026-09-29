"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatToman, toPersianDigits } from "@/lib/persian";

/** "۱٬۲۲۵٬۰۰۰" — Persian digits with thousands separators, no unit. */
export function formatAmount(amount: number) {
  return toPersianDigits(Math.round(amount).toLocaleString("en-US").replace(/,/g, "٬"));
}

/** "۴۵٪" or "۴۵٫۷٪" — the effective percent can be fractional when services have their own rate. */
export function formatPercent(percent: number) {
  return `${toPersianDigits(String(Math.round(percent * 10) / 10).replace(".", "٫"))}٪`;
}
import { addDaysToDateKey, formatSalonDate, salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import { dateKeyToDate, toJalali } from "@/lib/jalali";
import type { AccountingPeriod } from "@/lib/accountingPeriod";
import { cx } from "./ui";
import PickerSelect from "./PickerSelect";

// Building blocks shared by the salon accounting page and the stylist earnings page.

/** "‹ مهر ۱۴۰۵ ›" — step through Jalali months; can't go past the current month unless `allowFuture`. */
export function PeriodSwitcher({ period, onChange, allowFuture }: { period: AccountingPeriod; onChange: (offset: number) => void; allowFuture?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-3xl border border-app-line bg-app-card p-1.5 shadow-app">
      {/* RTL: the earlier month sits on the right. */}
      <button
        type="button"
        onClick={() => onChange(period.offset - 1)}
        aria-label="ماه قبل"
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-app-ink active:bg-app-card-2"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
      <div className="text-center">
        <p className="text-[17px] font-black text-app-ink">{period.label}</p>
        {period.offset === 0 && <p className="text-[11px] font-medium text-app-muted">ماه جاری</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(period.offset + 1)}
        disabled={!allowFuture && period.offset >= 0}
        aria-label="ماه بعد"
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-app-ink active:bg-app-card-2 disabled:opacity-25"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

/** An amount on the dark summary cards: small "تومان" that wraps under the number instead of truncating it. */
export function HeroAmount({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-white/55">{label}</p>
      <p className="flex flex-wrap items-baseline gap-x-1 text-[15px] font-black leading-tight">
        <span className="whitespace-nowrap">{formatAmount(amount)}</span>
        <span className="text-[10px] font-medium text-white/55">تومان</span>
      </p>
    </div>
  );
}

/** A stylist's all-time balance: positive = the salon owes them, negative = paid in advance. */
export function BalanceChip({ balanceToman, size = "sm" }: { balanceToman: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-0.5 text-[11px]";
  if (balanceToman === 0) return <span className={cx("rounded-full bg-app-done/12 font-bold text-app-done", cls)}>تسویه</span>;
  if (balanceToman > 0) {
    return <span className={cx("rounded-full bg-app-pending/15 font-bold text-app-pending", cls)}>طلب {formatToman(balanceToman)}</span>;
  }
  return <span className={cx("rounded-full bg-app-card-2 font-bold text-app-muted", cls)}>پیش‌پرداخت {formatToman(-balanceToman)}</span>;
}

/**
 * One labelled amount in a summary grid. The "تومان" unit is small and may wrap under the number,
 * so three figures fit side by side on a phone without truncating the amount.
 */
export function MoneyFigure({ label, amount, tone = "ink", big }: { label: string; amount: number; tone?: "ink" | "accent" | "danger" | "done" | "muted"; big?: boolean }) {
  const toneClass = {
    ink: "text-app-ink",
    accent: "text-app-accent",
    danger: "text-app-danger",
    done: "text-app-done",
    muted: "text-app-muted",
  }[tone];
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-app-muted">{label}</p>
      <p className={cx("mt-0.5 flex flex-wrap items-baseline gap-x-1 font-black leading-tight", big ? "text-2xl" : "text-[15px]", toneClass)}>
        <span className="whitespace-nowrap">{formatAmount(amount)}</span>
        <span className="text-[11px] font-medium text-app-muted">تومان</span>
      </p>
    </div>
  );
}

function dayLabel(key: string, todayKey: string) {
  const j = toJalali(dateKeyToDate(key));
  const base = `${j.weekDay.name} ${toPersianDigits(j.day)} ${j.month.name}`;
  return key === todayKey ? `امروز — ${base}` : base;
}

/**
 * Pick a salon-local day with Persian labels (no native date input). Days run from `fromKey` to
 * `toKey` inclusive (at most 400 of them), newest first, plus `value` itself when it falls
 * outside that list. Value/onChange are "YYYY-MM-DD" keys.
 */
export function DaySelect({ value, onChange, fromKey, toKey, label }: { value: string; onChange: (key: string) => void; fromKey: string; toKey: string; label: string }) {
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const keys: string[] = [];
  for (let k = toKey; k >= fromKey && keys.length < 400; k = addDaysToDateKey(k, -1)) keys.push(k);
  // The list is capped at 400 days, but the current value is always listed (e.g. an expense
  // older than that), so the picker shows it and saving keeps it. Keys sort as dates.
  if (value && !keys.includes(value)) {
    if (keys.length === 0 || value > keys[0]) keys.unshift(value);
    else keys.push(value);
  }
  return (
    <PickerSelect title={label} value={value} onChange={onChange} options={keys.map((k) => ({ value: k, label: dayLabel(k, todayKey) }))} />
  );
}

/** Noon on a salon-local day, as an ISO instant — safe for "which day was this" bookkeeping. */
export function dayKeyToInstant(key: string) {
  return salonWallTimeToInstant(key, 12 * 60).toISOString();
}

/** The salon-local day key of an ISO instant. */
export function instantToDayKey(iso: string) {
  return toSalonWallTime(iso).dateKey;
}

export function shortDate(iso: string) {
  return toPersianDigits(formatSalonDate(iso));
}
