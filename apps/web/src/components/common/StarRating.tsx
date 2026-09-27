"use client";

import { Star } from "lucide-react";
import { toPersianDigits } from "@/lib/persian";

// Five-star rating, shared by the public salon page (display) and the panels (input + display).
// Stars follow the page direction, so in RTL the first star is on the right and they fill
// right-to-left, as Persian apps do.

const LABELS = ["خیلی بد", "بد", "معمولی", "خوب", "عالی"];

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Read-only stars. `value` may be fractional (an average); it's rounded to the nearest star. */
export function Stars({
  value,
  size = 16,
  className,
  emptyClassName = "text-gray-300 dark:text-gray-700",
}: {
  value: number;
  size?: number;
  className?: string;
  emptyClassName?: string;
}) {
  const filled = Math.round(value);
  return (
    <span className={cx("inline-flex shrink-0 gap-0.5", className)} role="img" aria-label={`${toPersianDigits(value.toFixed(value % 1 ? 1 : 0))} از ${toPersianDigits(5)} ستاره`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= filled ? "fill-amber-400 text-amber-400" : emptyClassName}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Tappable 1–5 stars with a word for the chosen score. 0 = not rated yet. */
export function StarRatingInput({
  value,
  onChange,
  label,
  size = 40,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name, e.g. "امتیاز به سالن". */
  label: string;
  size?: number;
  disabled?: boolean;
}) {
  function onKeyDown(e: React.KeyboardEvent) {
    // Arrow keys follow the visual direction: in RTL, ArrowLeft moves to the next (higher) star.
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const up = rtl ? "ArrowLeft" : "ArrowRight";
    const down = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === up || e.key === "ArrowUp") onChange(Math.min(5, value + 1));
    else if (e.key === down || e.key === "ArrowDown") onChange(Math.max(1, value - 1));
    else return;
    e.preventDefault();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex justify-center gap-1.5" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${toPersianDigits(n)} ستاره — ${LABELS[n - 1]}`}
            tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="rounded-full p-0.5 transition active:scale-90 disabled:opacity-60"
          >
            <Star
              style={{ width: size, height: size }}
              className={cx("transition", n <= value ? "fill-amber-400 text-amber-400" : "text-app-line")}
              aria-hidden
            />
          </button>
        ))}
      </div>
      <span className="h-5 text-sm font-bold text-app-muted" aria-live="polite">
        {value > 0 ? LABELS[value - 1] : ""}
      </span>
    </div>
  );
}
