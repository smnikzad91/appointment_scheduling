"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

// Every public page's search-engine title / description / keywords (/api/admin/seo, PageSeo rows).
// An empty field uses the page's default, shown as the placeholder.

interface Values {
  title: string;
  description: string;
  keywords: string[];
}

interface PageEntry extends Values {
  key: string;
  label: { fa: string; en: string };
  path: string;
  placeholders: string[];
  defaults: Values;
  updatedAt: string | null;
}

// Google shows about this much of each in results
const TITLE_SOFT_MAX = 60;
const DESCRIPTION_SOFT_MAX = 160;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

export default function AdminSeoSettings() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const [pages, setPages] = useState<PageEntry[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error();
      setPages(await res.json());
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  return (
    <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("seoSettingsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("seoSettingsSubtitle")}</p>
      </div>
      {error ? (
        <p className="py-10 text-center text-sm text-red-500">{t("seoError")}</p>
      ) : !pages ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <PageCard key={p.key} page={p} onSaved={(saved) => setPages((list) => list?.map((x) => (x.key === p.key ? { ...x, ...saved } : x)) ?? null)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageCard({ page, onSaved }: { page: PageEntry; onSaved: (v: Values & { updatedAt: string }) => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const { num, apiError } = useLocaleFormat();
  const isRTL = lang === "fa";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Values>({ title: page.title, description: page.description, keywords: page.keywords });
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  // what the page actually uses: the saved value, or the default
  const titleNow = form.title.trim() || page.defaults.title;
  const descriptionNow = form.description.trim() || page.defaults.description;
  const keywordsNow = form.keywords.length ? form.keywords : page.defaults.keywords;
  const custom = !!(page.title || page.description || page.keywords.length);

  const addKeyword = (raw: string) => {
    const k = raw.trim();
    if (k && !form.keywords.includes(k)) setForm((f) => ({ ...f, keywords: [...f.keywords, k] }));
    setKeywordInput("");
  };

  async function save(values: Values) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: page.key, ...values }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      setForm({ title: d.title, description: d.description, keywords: d.keywords });
      setKeywordInput("");
      onSaved(d);
      toast.success(t("seoSaved"));
    } catch (err) {
      toast.error(apiError(err, t("seoSaveError")));
    } finally {
      setSaving(false);
    }
  }

  const keywordsToSave = keywordInput.trim() && !form.keywords.includes(keywordInput.trim()) ? [...form.keywords, keywordInput.trim()] : form.keywords;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 p-4 text-start">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900 dark:text-white">
            {page.label[lang === "fa" ? "fa" : "en"]}
            <span dir="ltr" className="font-mono text-xs font-normal text-gray-400">{page.path}</span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${custom ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
              {custom ? t("seoCustom") : t("seoUsingDefault")}
            </span>
          </p>
          {!open && <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{titleNow}</p>}
        </div>
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-100 p-4 dark:border-gray-800">
          {page.placeholders.length > 0 && (
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {t("seoPlaceholdersHint")} <span dir="ltr" className="font-mono">{page.placeholders.join("  ")}</span>
            </p>
          )}

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span>{t("seoFieldTitle")}</span>
              <Counter n={titleNow.length} max={TITLE_SOFT_MAX} num={num} />
            </label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={page.defaults.title} maxLength={120} className={inputClass} />
            <p className="mt-1 text-xs text-gray-400">{page.key === "home" ? t("seoTitleHomeHint") : t("seoTitleSuffixHint")}</p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span>{t("seoFieldDescription")}</span>
              <Counter n={descriptionNow.length} max={DESCRIPTION_SOFT_MAX} num={num} />
            </label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={page.defaults.description} maxLength={400} className={`${inputClass} resize-y`} />
            {page.key.endsWith("-page") && <p className="mt-1 text-xs text-gray-400">{t("seoSalonDescriptionHint")}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">{t("seoFieldKeywords")}</label>
            <div className="flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800">
              {form.keywords.map((k) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {k}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((x) => x !== k) }))} className="text-brand-400 hover:text-brand-600">×</button>
                </span>
              ))}
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "," || e.key === "،") { e.preventDefault(); addKeyword(keywordInput); } }}
                onBlur={() => keywordInput.trim() && addKeyword(keywordInput)}
                className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
                placeholder={form.keywords.length === 0 ? t("seoFieldKeywordsPlaceholder") : ""}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {form.keywords.length === 0 && keywordsNow.length > 0 ? `${t("seoDefaultKeywords")}: ${keywordsNow.join("، ")}` : t("seoFieldKeywordsHint")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-xs text-gray-400">
              {page.updatedAt && `${t("seoLastUpdated")}: ${new Date(page.updatedAt).toLocaleDateString(isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving || !custom}
                onClick={() => { if (window.confirm(t("seoResetConfirm"))) void save({ title: "", description: "", keywords: [] }); }}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                {t("seoUseDefault")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ ...form, keywords: keywordsToSave })}
                className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? t("seoSaving") : t("seoSave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ n, max, num }: { n: number; max: number; num: (v: number | string) => string }) {
  return <span className={`text-xs font-normal ${n > max ? "text-amber-600" : "text-gray-400"}`}>{num(n)} / {num(max)}</span>;
}
