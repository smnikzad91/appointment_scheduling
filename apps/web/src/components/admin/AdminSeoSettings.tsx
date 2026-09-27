"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

interface SeoData {
  title: string;
  description: string;
  keywords: string[];
  updatedAt?: string;
}

const defaultData: SeoData = { title: "", description: "", keywords: [] };

export default function AdminSeoSettings() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [data, setData] = useState<SeoData>(defaultData);
  const [keywordInput, setKeywordInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSeo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/seo");
      if (!res.ok) throw new Error();
      const d: SeoData = await res.json();
      setData({ title: d.title ?? "", description: d.description ?? "", keywords: d.keywords ?? [], updatedAt: d.updatedAt });
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(fetchSeo); }, [fetchSeo]);

  const addKeyword = (raw: string) => {
    const keyword = raw.trim();
    if (keyword && !data.keywords.includes(keyword)) {
      setData((prev) => ({ ...prev, keywords: [...prev.keywords, keyword] }));
    }
    setKeywordInput("");
  };
  const removeKeyword = (keyword: string) =>
    setData((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k !== keyword) }));
  const onKeywordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(keywordInput); }
  };

  const handleSave = async () => {
    const keywords = keywordInput.trim() ? [...data.keywords, keywordInput.trim()] : data.keywords;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, description: data.description, keywords }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData({ title: d.title ?? "", description: d.description ?? "", keywords: d.keywords ?? [], updatedAt: d.updatedAt });
      setKeywordInput("");
      toast.success(t("seoSaved"));
    } catch {
      toast.error(t("seoError"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

  return (
    <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("seoSettingsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("seoSettingsSubtitle")}</p>
      </div>

      {/* Editor card */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-4">
            <div className="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-red-500">{t("seoError")}</p>
        ) : (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("seoFieldTitle")}
              </label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                placeholder={t("seoFieldTitlePlaceholder")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("seoFieldDescription")}
              </label>
              <textarea
                rows={4}
                value={data.description}
                onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
                className={`${inputClass} resize-y`}
                placeholder={t("seoFieldDescriptionPlaceholder")}
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("seoFieldKeywords")}
              </label>
              <div className="flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800">
                {data.keywords.map((keyword) => (
                  <span key={keyword} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {keyword}
                    <button type="button" onClick={() => removeKeyword(keyword)} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-300">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={onKeywordKey}
                  onBlur={() => keywordInput.trim() && addKeyword(keywordInput)}
                  className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                  placeholder={data.keywords.length === 0 ? t("seoFieldKeywordsPlaceholder") : ""}
                  dir={isRTL ? "rtl" : "ltr"}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t("seoFieldKeywordsHint")}</p>
            </div>

            {/* Footer: last updated + save */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              {data.updatedAt ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("seoLastUpdated")}:{" "}
                  {new Date(data.updatedAt).toLocaleDateString(isRTL ? "fa-IR" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              ) : (
                <span />
              )}
              <button
                onClick={handleSave}
                disabled={saving || !data.title.trim() || !data.description.trim()}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-all disabled:opacity-60"
              >
                {saving ? t("seoSaving") : t("seoSave")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
