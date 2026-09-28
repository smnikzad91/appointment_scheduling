"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, SearchX } from "lucide-react";
import { normalizePlaceName } from "@appointment-scheduling/iran-locations";
import Sheet from "./Sheet";
import { cx } from "./ui";

// Replacement for the panels' native <select>: a field-looking trigger that opens a bottom sheet
// list (current choice highlighted, scrolled into view; a search box once the list is long).
// Native selects open the OS picker, which can't be styled and scrolls poorly with long lists.

export interface PickerOption {
  value: string;
  label: string;
  /** Second line under the label (e.g. a card number). */
  hint?: string;
}

export default function PickerSelect({
  value,
  onChange,
  options,
  title,
  placeholder = "انتخاب کنید",
  searchable,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  /** Sheet heading and the trigger's accessible name. */
  title: string;
  placeholder?: string;
  /** Defaults to on for lists longer than 12. */
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [guest, setGuest] = useState(false);
  const rootRef = useRef<HTMLButtonElement>(null);
  // The sheet is portalled out of the page; keep the dark guest theme if we're on a guest page.
  useEffect(() => setGuest(!!rootRef.current?.closest(".guest-root")), []);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${title}: ${current?.label ?? placeholder}`}
        className={cx(
          "flex h-12 w-full items-center gap-2 rounded-2xl border border-app-line bg-app-card px-4 text-start text-app-ink outline-none transition focus-visible:border-app-accent focus-visible:ring-4 focus-visible:ring-app-accent/15 active:scale-[0.99]",
          className,
        )}
      >
        <span className={cx("min-w-0 flex-1 truncate", !current && "text-app-muted/70")}>{current?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} themeClassName={guest ? "guest-root" : ""}>
        <OptionList
          options={options}
          value={value}
          searchable={searchable ?? options.length > 12}
          title={title}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

// Mounted only while the sheet is open, so the search starts empty each time.
function OptionList({
  options,
  value,
  searchable,
  title,
  onPick,
}: {
  options: PickerOption[];
  value: string;
  searchable: boolean;
  title: string;
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => selectedRef.current?.scrollIntoView({ block: "center" }), []);

  const q = normalizePlaceName(query);
  const shown = q ? options.filter((o) => normalizePlaceName(`${o.label} ${o.hint ?? ""}`).includes(q)) : options;

  return (
    <>
      {searchable && (
        <div className="sticky top-0 z-10 -mx-5 bg-app-bg px-5 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو…"
              aria-label={`جستجو در ${title}`}
              className="h-12 w-full rounded-2xl border border-app-line bg-app-card-2 pe-4 ps-11 text-app-ink outline-none transition placeholder:text-app-muted/70 focus:border-app-accent focus:ring-4 focus:ring-app-accent/15"
            />
          </label>
        </div>
      )}
      <ul className="flex flex-col gap-1.5" role="listbox" aria-label={title}>
        {shown.map((o, i) => {
          const active = o.value === value;
          return (
            <li key={o.value} role="option" aria-selected={active}>
              <button
                ref={active ? selectedRef : undefined}
                type="button"
                onClick={() => onPick(o.value)}
                className={cx(
                  "app-rise flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-start transition active:scale-[0.99]",
                  active ? "border-app-accent/60 bg-app-accent-soft text-app-accent" : "border-transparent bg-app-card text-app-ink hover:border-app-line",
                )}
                style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
              >
                <span className="min-w-0">
                  <span className={cx("block text-[15px]", active && "font-bold")}>{o.label}</span>
                  {o.hint && <span className="mt-0.5 block text-xs text-app-muted">{o.hint}</span>}
                </span>
                {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.6} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-app-muted">
          <SearchX className="h-8 w-8 opacity-50" aria-hidden />
          «{query}» پیدا نشد
        </div>
      )}
    </>
  );
}
