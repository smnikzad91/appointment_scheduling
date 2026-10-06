"use client";

import type { SalonKind } from "@/lib/independent";
import { useEffect, useMemo, useState } from "react";
import { List, LoaderCircle, LocateFixed, Map as MapIcon, Navigation, Search, SearchX, Star, X } from "lucide-react";
import { searchSalons, type SalonCard, type SalonSearchParams } from "@/lib/api/discovery";
import { toPersianDigits } from "@/lib/persian";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
import { EmptyState, ErrorBanner, ListSkeleton, cx, riseStyle } from "@/components/app/ui";
import SalonResultCard from "./SalonResultCard";
import SalonsMapLoader from "./SalonsMapLoader";

// Salon discovery: text search, province → city filter, and "near me" (browser GPS → distance
// from apps/api, radius chips, nearest first), as a list or on a map. Used by the public /salons
// page and the customer panel's «کشف سالن» tab; filters are mirrored into the URL so a search can
// be shared or reloaded.

const PAGE = 20;
const RADII = [0, 2, 5, 10, 25] as const; // 0 = no limit
const SELECT_CLASS =
  "h-12 w-full appearance-none rounded-2xl border border-app-line bg-app-card px-4 text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/15 disabled:opacity-50";

export interface SalonSearchInitial {
  kind?: SalonKind;
  province?: string;
  city?: string;
  q?: string;
}

type Near = { lat: number; lng: number };
type LocateState = "idle" | "locating" | "denied" | "unavailable";

export default function SalonSearch({ initial = {} }: { initial?: SalonSearchInitial }) {
  const [place, setPlace] = useState({ province: initial.province ?? "", city: initial.city ?? "" });
  const [kind, setKind] = useState<SalonKind | "">(initial.kind ?? "");
  const [qInput, setQInput] = useState(initial.q ?? "");
  const [q, setQ] = useState(initial.q ?? "");
  const [near, setNear] = useState<Near | null>(null);
  const [locate, setLocate] = useState<LocateState>("idle");
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [sort, setSort] = useState<"distance" | "rating">("distance");
  const [view, setView] = useState<"list" | "map">("list");
  const [results, setResults] = useState<{ key: string; items: SalonCard[]; total: number } | null>(null);
  const [error, setError] = useState<{ key: string } | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  // Debounce typing.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = useMemo<SalonSearchParams>(
    () => ({
      kind: kind || undefined,
      province: place.province || undefined,
      city: place.city || undefined,
      q: q || undefined,
      ...(near && { lat: near.lat, lng: near.lng, sort, ...(radiusKm > 0 && { radiusKm }) }),
      limit: PAGE,
    }),
    [kind, place, q, near, sort, radiusKm],
  );
  const key = JSON.stringify(params) + retry;

  useEffect(() => {
    let cancelled = false;
    searchSalons(params)
      .then((r) => !cancelled && setResults({ key, items: r.items, total: r.total }))
      .catch(() => !cancelled && setError({ key }));
    return () => {
      cancelled = true;
    };
  }, [params, key]);

  // Keep the filters in the address bar (without reloading).
  useEffect(() => {
    const url = new URL(window.location.href);
    const type = kind === "INDEPENDENT" ? "independent" : kind === "SALON" ? "salon" : "";
    for (const [k, v] of [["type", type], ["province", place.province], ["city", place.city], ["q", q]] as const) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    window.history.replaceState(window.history.state, "", url);
  }, [kind, place, q]);

  const loading = results?.key !== key && error?.key !== key;
  const failed = error?.key === key;

  function findMe() {
    if (!navigator.geolocation) return setLocate("unavailable");
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocate("idle");
        setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
      },
      (err) => setLocate(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  }

  async function loadMore() {
    if (!results) return;
    setMoreBusy(true);
    try {
      const r = await searchSalons({ ...params, offset: results.items.length });
      setResults((cur) => (cur && cur.key === key ? { ...cur, items: [...cur.items, ...r.items], total: r.total } : cur));
    } catch {
      // keep what's shown; the button stays for another try
    } finally {
      setMoreBusy(false);
    }
  }

  const items = results?.items ?? [];
  const chip = (active: boolean) =>
    cx(
      "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95",
      active ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
    );

  return (
    <div>
      {/* Text search */}
      <label className="relative block">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-app-muted" aria-hidden />
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="نام سالن یا خدمت، مثلاً کاشت ناخن"
          aria-label="جستجوی سالن"
          className="h-12 w-full rounded-2xl border border-app-line bg-app-card pe-11 ps-12 text-app-ink outline-none transition placeholder:text-app-muted/70 focus:border-app-accent focus:ring-4 focus:ring-app-accent/15"
        />
        {qInput && (
          <button type="button" onClick={() => setQInput("")} aria-label="پاک کردن" className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-app-muted">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </label>

      {/* Salons, independent stylists, or both */}
      <div role="radiogroup" aria-label="نوع" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(
          [
            ["", "همه"],
            ["SALON", "سالن‌ها"],
            ["INDEPENDENT", "آرایشگران مستقل"],
          ] as const
        ).map(([v, label]) => (
          <button key={v || "all"} type="button" role="radio" aria-checked={kind === v} onClick={() => setKind(v)} className={chip(kind === v)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <ProvinceCitySelect
          value={place}
          onChange={setPlace}
          selectClassName={SELECT_CLASS}
          labelClassName="px-1 text-[13px] font-bold text-app-muted"
          anyOption={{ province: "همه استان‌ها", city: "همه شهرها" }}
        />
      </div>

      {/* Near me + radius */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => (near ? (setNear(null), setRadiusKm(0)) : findMe())}
          aria-pressed={!!near}
          className={cx(chip(!!near), near ? "" : "border-app-accent/40 text-app-accent")}
        >
          {locate === "locating" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
          {near ? "نزدیک من ✓" : "نزدیک من"}
        </button>
        {near &&
          RADII.map((r) => (
            <button key={r} type="button" onClick={() => setRadiusKm(r)} aria-pressed={radiusKm === r} className={chip(radiusKm === r)}>
              {r === 0 ? "هر فاصله‌ای" : `تا ${toPersianDigits(r)} کیلومتر`}
            </button>
          ))}
      </div>
      {(locate === "denied" || locate === "unavailable") && (
        <p className="mt-2 rounded-2xl bg-app-pending/10 px-3 py-2 text-xs leading-6 text-app-pending">
          {locate === "denied"
            ? "اجازه دسترسی به موقعیت داده نشد. می‌توانید از تنظیمات مرورگر اجازه دهید یا استان و شهر را انتخاب کنید."
            : "موقعیت شما پیدا نشد. GPS گوشی را روشن کنید یا استان و شهر را انتخاب کنید."}
        </p>
      )}

      {/* Result header: count, sort, list/map */}
      <div className="mb-3 mt-5 flex items-center justify-between gap-2">
        <p className="text-sm text-app-muted">
          {loading && !results ? "در حال جستجو…" : `${toPersianDigits(results?.total ?? 0)} سالن`}
          {loading && results && <LoaderCircle className="ms-2 inline h-4 w-4 animate-spin" aria-hidden />}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-app-line bg-app-card p-0.5" role="tablist" aria-label="نمایش">
            {(
              [
                ["list", List, "فهرست"],
                ["map", MapIcon, "نقشه"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cx("flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold", view === v ? "bg-app-ink text-app-bg" : "text-app-muted")}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort only matters around the customer's position; a segmented control, not a native select. */}
      {near && (
        <div className="-mt-1 mb-3 flex items-center gap-2">
          <span className="text-[13px] text-app-muted">مرتب‌سازی</span>
          <div className="flex rounded-full border border-app-line bg-app-card p-0.5" role="radiogroup" aria-label="مرتب‌سازی">
            {(
              [
                ["distance", Navigation, "نزدیک‌ترین"],
                ["rating", Star, "بالاترین امتیاز"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={sort === v}
                onClick={() => setSort(v)}
                className={cx(
                  "flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition",
                  sort === v ? "bg-app-accent text-app-accent-ink" : "text-app-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {failed ? (
        <ErrorBanner onRetry={() => setRetry((n) => n + 1)}>جستجو انجام نشد</ErrorBanner>
      ) : !results ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="سالنی پیدا نشد"
          hint={near && radiusKm > 0 ? "فاصله را بیشتر کنید یا فیلترها را بردارید." : "عبارت یا فیلتر دیگری را امتحان کنید."}
        />
      ) : view === "map" ? (
        <div className={cx("h-[62vh] overflow-hidden rounded-3xl border border-app-line shadow-app", loading && "opacity-60")}>
          <SalonsMapLoader salons={items} me={near} />
        </div>
      ) : (
        <div className={cx("flex flex-col gap-2.5 transition-opacity", loading && "opacity-60")}>
          {items.map((s, i) => (
            <SalonResultCard key={s.id} salon={s} style={riseStyle(Math.min(i, 8))} />
          ))}
          {items.length < results.total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={moreBusy}
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl border border-app-line bg-app-card text-sm font-bold text-app-ink active:scale-[0.99] disabled:opacity-60"
            >
              {moreBusy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              نمایش بیشتر
            </button>
          )}
        </div>
      )}
      {view === "map" && items.some((s) => s.latitude === null) && (
        <p className="mt-2 px-1 text-xs text-app-muted">سالن‌هایی که موقعیتشان را ثبت نکرده‌اند روی نقشه نیستند.</p>
      )}
    </div>
  );
}
