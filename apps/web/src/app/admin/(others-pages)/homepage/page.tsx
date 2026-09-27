"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Search, Star, Trash2, X } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  getAdminShowcase,
  searchShowcaseSalons,
  searchShowcaseStylists,
  setFeaturedSalons,
  setFeaturedStylists,
  updateBanner,
  updateShowcaseSettings,
  type AdminBanner,
  type AdminShowcase,
  type ShowcaseSalon,
  type ShowcaseStylist,
} from "@/lib/api/showcase";
import { releaseUploads, uploadImage } from "@/lib/uploadImage";
import { normalizeDigits } from "@/lib/persian";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

const MAX_FEATURED = 3;

const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const input =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90";
const primaryBtn = "rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const ghostBtn =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5";

function Rating({ rating, count }: { rating: number | null; count: number }) {
  const t = useT();
  const { num } = useLocaleFormat();
  if (rating === null) return <span className="text-xs text-gray-400">{t("hpNoRating")}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      {num(rating.toFixed(1))} ({num(count)})
    </span>
  );
}

function Thumb({ src, name, round }: { src: string | null; name: string; round?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`h-11 w-11 shrink-0 object-cover ${round ? "rounded-full" : "rounded-lg"}`} />
  ) : (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center bg-gray-100 font-bold text-gray-500 dark:bg-gray-800 ${round ? "rounded-full" : "rounded-lg"}`}>
      {name.slice(0, 1)}
    </span>
  );
}

export default function AdminHomepagePage() {
  const token = useApiAccessToken();
  const t = useT();
  const [data, setData] = useState<AdminShowcase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAdminShowcase(token)
      .then(setData)
      .catch(() => setError(t("hpLoadError")));
  }, [token, t]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{t("hpTitle")}</h1>
          <p className="text-sm text-gray-500">{t("hpSubtitle")}</p>
        </div>
        <Link href="/" target="_blank" className={`${ghostBtn} inline-flex items-center gap-1.5`}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          {t("hpViewSite")}
        </Link>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
      {!data || !token ? (
        !error && <p className="text-sm text-gray-500">{t("hpLoading")}</p>
      ) : (
        <>
          <BannerEditor token={token} initial={data.banner} />

          <FeaturedEditor<ShowcaseSalon>
            title={t("hpFeaturedSalons")}
            hint={t("hpFeaturedSalonsHint")}
            initial={data.featuredSalons}
            search={(q) => searchShowcaseSalons(token, q)}
            save={async (ids) => (await setFeaturedSalons(token, ids)).featuredSalons}
            renderItem={(s) => (
              <>
                <Thumb src={s.logoUrl} name={s.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900 dark:text-white">{s.name}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {s.city}
                    <Rating rating={s.rating} count={s.ratingCount} />
                  </span>
                </span>
              </>
            )}
          />

          <FeaturedEditor<ShowcaseStylist>
            title={t("hpFeaturedStylists")}
            hint={t("hpFeaturedStylistsHint")}
            initial={data.featuredStylists}
            search={(q) => searchShowcaseStylists(token, q)}
            save={async (ids) => (await setFeaturedStylists(token, ids)).featuredStylists}
            renderItem={(s) => (
              <>
                <Thumb src={s.avatarUrl} name={s.displayName} round />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900 dark:text-white">{s.displayName}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-500">
                    {s.salon.name}
                    <Rating rating={s.rating} count={s.ratingCount} />
                  </span>
                </span>
              </>
            )}
          />

          <TopRatedSettings token={token} initialMinRatings={data.settings.minRatings} />
        </>
      )}
    </div>
  );
}

/** Explains the automatic top-rated lists and edits how many ratings they require. */
function TopRatedSettings({ token, initialMinRatings }: { token: string; initialMinRatings: number }) {
  const t = useT();
  const { apiError } = useLocaleFormat();
  const [saved, setSaved] = useState(initialMinRatings);
  const [draft, setDraft] = useState(String(initialMinRatings));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const value = Number(draft);
  const valid = Number.isInteger(value) && value >= 1 && value <= 50;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateShowcaseSettings(token, { minRatings: value });
      setSaved(updated.minRatings);
      setMessage({ ok: true, text: t("hpSaved") });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, t("hpSaveFailed")) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="font-bold text-gray-900 dark:text-white">{t("hpTopTitle")}</h2>
      <p className="mb-4 mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">{t("hpTopBody")}</p>
      <label className="flex max-w-md flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hpMinRatings")}</span>
        <span className="flex items-center gap-3">
          <input
            className={`${input.replace("w-full", "")} w-24 text-center`}
            inputMode="numeric"
            dir="ltr"
            maxLength={2}
            value={draft}
            onChange={(e) => setDraft(normalizeDigits(e.target.value).replace(/\D/g, ""))}
            aria-invalid={!valid}
          />
          <button type="button" className={primaryBtn} disabled={!valid || value === saved || busy} onClick={save}>
            {busy ? t("hpSaving") : t("hpSave")}
          </button>
          {message && <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-rose-500"}`}>{message.text}</span>}
        </span>
        <span className="text-xs leading-6 text-gray-500">
          {t("hpMinRatingsHint")}
        </span>
      </label>
    </section>
  );
}

function BannerEditor({ token, initial }: { token: string; initial: AdminBanner }) {
  const t = useT();
  const { apiError } = useLocaleFormat();
  const [saved, setSaved] = useState(initial);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [title, setTitle] = useState(initial.title ?? "");
  const [linkUrl, setLinkUrl] = useState(initial.linkUrl ?? "");
  const [active, setActive] = useState(initial.active);
  const [busy, setBusy] = useState<"upload" | "save" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = imageUrl !== saved.imageUrl || title !== (saved.title ?? "") || linkUrl !== (saved.linkUrl ?? "") || active !== saved.active;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    setMessage(null);
    try {
      const url = await uploadImage(file, "banners");
      if (imageUrl && imageUrl !== saved.imageUrl) releaseUploads([imageUrl]); // replaced an unsaved upload
      setImageUrl(url);
    } catch {
      setMessage({ ok: false, text: t("hpUploadFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const updated = await updateBanner(token, { imageUrl, title: title.trim() || null, linkUrl: linkUrl.trim() || null, active });
      if (saved.imageUrl && saved.imageUrl !== updated.imageUrl) releaseUploads([saved.imageUrl]);
      setSaved(updated);
      setMessage({ ok: true, text: t("hpSaved") });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, t("hpBannerSaveFailed")) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">{t("hpBanner")}</h2>
          <p className="text-xs text-gray-500">{t("hpBannerHint")}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-500" />
          {t("hpBannerShow")}
        </label>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
        className="relative block aspect-[3/1] w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title || t("hpBannerAlt")} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
            <ImagePlus className="h-7 w-7" aria-hidden />
            {busy === "upload" ? t("hpUploading") : t("hpPickImage")}
          </span>
        )}
        {imageUrl && (
          <span className="absolute bottom-2 end-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {busy === "upload" ? t("hpUploading") : t("hpChangeImage")}
          </span>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {imageUrl && (
        <button type="button" onClick={() => setImageUrl(null)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-600">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t("hpRemoveImage")}
        </button>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hpBannerTitle")}</span>
          <input className={input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={t("hpBannerTitlePh")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hpBannerLink")}</span>
          <input
            className={input}
            dir="ltr"
            value={linkUrl}
            maxLength={500}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/offer"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className={primaryBtn} disabled={!dirty || busy !== null} onClick={save}>
          {busy === "save" ? t("hpSaving") : t("hpSaveBanner")}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-rose-500"}`}>{message.text}</span>}
      </div>
    </section>
  );
}

type Featured<T> = T & { visible?: boolean };

function FeaturedEditor<T extends { id: string }>({
  title,
  hint,
  initial,
  search,
  save,
  renderItem,
}: {
  title: string;
  hint: string;
  initial: Featured<T>[];
  search: (q: string) => Promise<T[]>;
  save: (ids: string[]) => Promise<Featured<T>[]>;
  renderItem: (item: T) => React.ReactNode;
}) {
  const t = useT();
  const { num, apiError } = useLocaleFormat();
  const [saved, setSaved] = useState<Featured<T>[]>(initial);
  const [items, setItems] = useState<Featured<T>[]>(initial);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; list: T[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Debounced search (an empty box lists the first matches too).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      search(q)
        .then((list) => !cancelled && setResults({ q, list }))
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const dirty = items.map((i) => i.id).join() !== saved.map((i) => i.id).join();
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const next = [...list];
      const [x] = next.splice(index, 1);
      next.splice(index + delta, 0, x);
      return next;
    });

  async function onSave() {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await save(items.map((i) => i.id));
      setSaved(updated);
      setItems(updated);
      setMessage({ ok: true, text: t("hpSaved") });
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, t("hpSaveFailed")) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="mb-4 text-xs text-gray-500">{hint}</p>

      <ol className="flex flex-col gap-2">
        {Array.from({ length: MAX_FEATURED }).map((_, i) => {
          const item = items[i];
          return (
            <li
              key={item?.id ?? `empty-${i}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/15">
                {num(i + 1)}
              </span>
              {item ? (
                <>
                  {renderItem(item)}
                  {item.visible === false && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t("hpHiddenNow")}</span>
                  )}
                  <span className="flex shrink-0 gap-1">
                    <button type="button" className={ghostBtn} aria-label={t("hpMoveUp")} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className={ghostBtn} aria-label={t("hpMoveDown")} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${ghostBtn} text-rose-600`}
                      aria-label={t("hpRemoveFeatured")}
                      onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">{t("hpEmptySlot")}</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute start-3 top-3 h-5 w-5 text-gray-400" aria-hidden />
        <input className={`${input} ps-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("hpSearchPh")} />
      </div>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
        {!results ? (
          <p className="p-3 text-sm text-gray-500">{t("hpSearching")}</p>
        ) : results.list.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">{t("hpNoResults")}</p>
        ) : (
          results.list.map((r) => {
            const already = items.some((i) => i.id === r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800">
                {renderItem(r)}
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={already || items.length >= MAX_FEATURED}
                  onClick={() => setItems((list) => [...list, r])}
                >
                  {already ? t("hpAdded") : t("hpAdd")}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className={primaryBtn} disabled={!dirty || busy} onClick={onSave}>
          {busy ? t("hpSaving") : t("hpSaveOrder")}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-rose-500"}`}>{message.text}</span>}
      </div>
    </section>
  );
}
