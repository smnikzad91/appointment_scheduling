"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, SearchX } from "lucide-react";
import { IRAN_PROVINCES, citiesOf, normalizePlaceName } from "@appointment-scheduling/iran-locations";
import Sheet from "@/components/app/Sheet";

// Cascading province → county pickers backed by packages/iran-locations (the same list apps/api
// validates against). Choosing a province clears a city that isn't in it, and opens the city
// picker straight away. Each field opens a searchable bottom sheet instead of a native <select>:
// the system picker can't be styled and a 40-county list is much faster to search than to scroll.
// Built on app tokens, so it fits the light panels and (via guest-root) the dark guest pages.

export interface ProvinceCity {
  province: string;
  city: string;
}

type Which = "province" | "city";

export default function ProvinceCitySelect({
  value,
  onChange,
  selectClassName,
  labelClassName,
  anyOption,
  required,
}: {
  value: ProvinceCity;
  onChange: (next: ProvinceCity) => void;
  /** Classes for the two trigger buttons (they replace the old <select>s). */
  selectClassName: string;
  labelClassName?: string;
  /** Adds an "all" first option (search filters); otherwise a placeholder that can't be re-chosen. */
  anyOption?: { province: string; city: string };
  required?: boolean;
}) {
  const [open, setOpen] = useState<Which | null>(null);
  const [guest, setGuest] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The sheet renders in a portal outside the page; carry the guest theme over so it stays dark.
  useEffect(() => {
    setGuest(!!rootRef.current?.closest(".guest-root"));
  }, []);

  const cities = citiesOf(value.province);
  const provinces = useMemo(() => IRAN_PROVINCES.map((p) => p.name), []);

  const pick = (which: Which, choice: string) => {
    if (which === "province") {
      const city = citiesOf(choice).includes(value.city) ? value.city : "";
      onChange({ province: choice, city });
      // Straight on to the county, unless one is already valid or the choice was "all".
      setOpen(choice && !city ? "city" : null);
    } else {
      onChange({ province: value.province, city: choice });
      setOpen(null);
    }
  };

  return (
    <div ref={rootRef} className="grid grid-cols-2 gap-3">
      <PickerField
        label="استان"
        required={required}
        value={value.province}
        placeholder={anyOption?.province ?? "انتخاب کنید"}
        className={selectClassName}
        labelClassName={labelClassName}
        onOpen={() => setOpen("province")}
      />
      <PickerField
        label="شهر / شهرستان"
        required={required}
        value={value.city}
        placeholder={!value.province ? "ابتدا استان" : anyOption?.city ?? "انتخاب کنید"}
        disabled={!value.province}
        className={selectClassName}
        labelClassName={labelClassName}
        onOpen={() => setOpen("city")}
      />

      <PickerSheet
        open={open === "province"}
        title="انتخاب استان"
        options={provinces}
        selected={value.province}
        anyLabel={anyOption?.province}
        themeClassName={guest ? "guest-root" : ""}
        onPick={(v) => pick("province", v)}
        onClose={() => setOpen(null)}
      />
      <PickerSheet
        open={open === "city"}
        title={value.province ? `شهرهای ${value.province}` : "انتخاب شهر"}
        options={cities}
        selected={value.city}
        anyLabel={anyOption?.city}
        themeClassName={guest ? "guest-root" : ""}
        onPick={(v) => pick("city", v)}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function PickerField({
  label,
  required,
  value,
  placeholder,
  disabled,
  className,
  labelClassName,
  onOpen,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  disabled?: boolean;
  className: string;
  labelClassName?: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={labelClassName}>
        {label}
        {required && <span className="text-app-danger"> *</span>}
      </span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={onOpen}
          aria-haspopup="dialog"
          className={`${className} flex items-center gap-2 text-start transition active:scale-[0.99] disabled:cursor-not-allowed`}
        >
          {value && <MapPin className="h-4 w-4 shrink-0 text-app-accent" aria-hidden />}
          <span className={`min-w-0 flex-1 truncate ${value ? "" : "opacity-60"}`}>{value || placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
        {/* Keeps the browser's "please fill in this field" check that the native select had. */}
        {required && !disabled && (
          <input
            tabIndex={-1}
            aria-hidden
            required
            value={value}
            onChange={() => {}}
            onFocus={onOpen}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
          />
        )}
      </div>
    </div>
  );
}

function PickerSheet({
  open,
  title,
  options,
  selected,
  anyLabel,
  themeClassName,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  options: string[];
  selected: string;
  anyLabel?: string;
  themeClassName: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // Start fresh next time: clear the search whenever the sheet is left.
  const close = () => {
    setQuery("");
    onClose();
  };
  const choose = (v: string) => {
    setQuery("");
    onPick(v);
  };

  const q = normalizePlaceName(query);
  const shown = q ? options.filter((o) => normalizePlaceName(o).includes(q)) : options;

  return (
    <Sheet open={open} onClose={close} title={title} themeClassName={themeClassName}>
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

      <ul className="flex flex-col gap-1.5" role="listbox" aria-label={title}>
        {anyLabel && !q && <Option label={anyLabel} active={selected === ""} onPick={() => choose("")} />}
        {shown.map((o, i) => (
          <Option key={o} label={o} active={o === selected} onPick={() => choose(o)} index={i} />
        ))}
      </ul>

      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-app-muted">
          <SearchX className="h-8 w-8 opacity-50" aria-hidden />
          «{query}» پیدا نشد
        </div>
      )}
    </Sheet>
  );
}

function Option({ label, active, onPick, index = 0 }: { label: string; active: boolean; onPick: () => void; index?: number }) {
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        onClick={onPick}
        className={`app-rise flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-start text-[15px] transition active:scale-[0.99] ${
          active
            ? "border-app-accent/60 bg-app-accent-soft font-bold text-app-accent"
            : "border-transparent bg-app-card text-app-ink hover:border-app-line"
        }`}
        // quick cascade on open, capped so long lists don't keep animating
        style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
      >
        {label}
        {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.6} aria-hidden />}
      </button>
    </li>
  );
}
