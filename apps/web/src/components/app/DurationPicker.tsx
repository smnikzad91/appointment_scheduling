"use client";

import { useState } from "react";
import { Clock, Minus, Plus } from "lucide-react";
import { cx } from "./ui";
import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { durationLabel, MAX_SERVICE_MINUTES, MIN_SERVICE_MINUTES } from "@/lib/serviceDuration";

const QUICK = [30, 45, 60, 90, 120, 180, 240, 360, 480, 600];
const MINUTE_STEPS = [0, 15, 30, 45];
const MAX_HOURS = MAX_SERVICE_MINUTES / 60;

/**
 * How long a service takes, up to 10 hours: the total in words on top, an hours stepper and a
 * 0 / 15 / 30 / 45 minutes switch, quick picks, and «دقیقه دلخواه» for an exact number (e.g. ۲۰ or ۵۰).
 * `value` is in minutes (0 = not set yet).
 */
export default function DurationPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const [custom, setCustom] = useState(() => value > 0 && value % 15 !== 0);
  const set = (m: number) => onChange(Math.max(0, Math.min(MAX_SERVICE_MINUTES, m)));
  const stepHours = (d: 1 | -1) => {
    const h = Math.max(0, Math.min(MAX_HOURS, hours + d));
    // 10 hours is the most: no minutes on top of it
    set(h * 60 + (h === MAX_HOURS ? 0 : minutes));
  };

  return (
    <div className="rounded-2xl border border-app-line bg-app-card p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-app-ink">
          <Clock className="h-4 w-4 text-app-accent" aria-hidden />
          مدت خدمت
        </span>
        <span className={cx("text-[15px] font-black", value ? "text-app-ink" : "text-app-muted")} aria-live="polite">
          {value ? durationLabel(value) : "انتخاب نشده"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5">
        <span className="text-xs font-bold text-app-muted">ساعت</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => stepHours(-1)}
            disabled={hours === 0}
            aria-label="یک ساعت کمتر"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-line bg-app-card-2 text-app-ink active:scale-95 disabled:opacity-35"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xl font-black tabular-nums text-app-ink" aria-label={`${toPersianDigits(hours)} ساعت`}>
            {toPersianDigits(hours)}
          </span>
          <button
            type="button"
            onClick={() => stepHours(1)}
            disabled={hours >= MAX_HOURS}
            aria-label="یک ساعت بیشتر"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-line bg-app-card-2 text-app-ink active:scale-95 disabled:opacity-35"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="ms-auto text-[11px] text-app-muted">حداکثر {toPersianDigits(MAX_HOURS)} ساعت</span>
        </div>

        <span className="text-xs font-bold text-app-muted">دقیقه</span>
        {custom ? (
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              dir="ltr"
              aria-label="دقیقه"
              value={minutes ? toPersianDigits(minutes) : ""}
              placeholder="۰"
              onChange={(e) => {
                const m = Math.min(59, Number(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 2)) || 0);
                set(hours * 60 + (hours === MAX_HOURS ? 0 : m));
              }}
              className="h-10 w-20 rounded-xl border border-app-line bg-app-bg px-3 text-center text-[16px] font-bold text-app-ink outline-none focus:border-app-accent"
            />
            <button type="button" onClick={() => setCustom(false)} className="text-xs font-bold text-app-accent">
              ۱۵ دقیقه‌ای
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-xl bg-app-card-2 p-1" role="radiogroup" aria-label="دقیقه">
              {MINUTE_STEPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={minutes === m}
                  disabled={hours === MAX_HOURS && m > 0}
                  onClick={() => set(hours * 60 + m)}
                  className={cx(
                    "h-8 min-w-11 rounded-lg px-2 text-sm font-bold tabular-nums transition disabled:opacity-35",
                    minutes === m ? "bg-app-card text-app-ink shadow-sm" : "text-app-muted",
                  )}
                >
                  {toPersianDigits(m)}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCustom(true)} className="ms-1 text-xs font-bold text-app-accent">
              دلخواه
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-app-line pt-3" role="group" aria-label="انتخاب سریع مدت">
        {QUICK.map((m) => {
          const active = value === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setCustom(false);
                set(m);
              }}
              aria-pressed={active}
              className={cx(
                "h-8 rounded-full px-3 text-xs font-semibold transition active:scale-95",
                active ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
              )}
            >
              {durationLabel(m)}
            </button>
          );
        })}
      </div>
      {value > 0 && value < MIN_SERVICE_MINUTES && <p className="mt-2 text-xs text-app-danger">مدت باید دست‌کم {toPersianDigits(MIN_SERVICE_MINUTES)} دقیقه باشد.</p>}
    </div>
  );
}
