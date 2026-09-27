"use client";

import { formatToman, normalizeDigits, toPersianDigits } from "@/lib/persian";
import { TextInput, cx } from "./ui";

const QUICK = [20, 30, 40, 50];
const EXAMPLE_TOMAN = 1_000_000;

/** Parses the typed percent; null when empty or outside 0–100. */
export function parseCommission(text: string): number | null {
  const digits = normalizeDigits(text).replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return n >= 0 && n <= 100 ? n : null;
}

/**
 * The stylist's share of the income from their appointments, in percent, with quick choices and a
 * worked example so the owner sees exactly what the number means.
 */
export default function CommissionInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const percent = parseCommission(value);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="relative w-28 shrink-0">
          <TextInput
            inputMode="numeric"
            dir="ltr"
            maxLength={3}
            className="pl-9 text-center text-lg font-black"
            value={value ? toPersianDigits(value) : ""}
            onChange={(e) => onChange(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 3))}
            placeholder="۰"
            aria-label="درصد سهم آرایشگر"
          />
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-bold text-app-muted">٪</span>
        </div>
        <div className="flex flex-1 gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChange(String(q))}
              className={cx(
                "h-10 flex-1 rounded-full text-sm font-bold transition active:scale-95",
                percent === q ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
              )}
            >
              {toPersianDigits(q)}٪
            </button>
          ))}
        </div>
      </div>
      <p className={cx("mt-2 px-1 text-xs leading-6", value && percent === null ? "text-app-danger" : "text-app-muted")}>
        {value && percent === null
          ? "عددی بین ۰ تا ۱۰۰ وارد کنید"
          : percent === null
            ? "سهم آرایشگر از مبلغی که مشتری برای نوبت‌های او می‌پردازد."
            : `از هر ${formatToman(EXAMPLE_TOMAN)}، ${formatToman((EXAMPLE_TOMAN * percent) / 100)} سهم آرایشگر و ${formatToman(
                EXAMPLE_TOMAN - (EXAMPLE_TOMAN * percent) / 100,
              )} سهم سالن.`}
      </p>
    </div>
  );
}
