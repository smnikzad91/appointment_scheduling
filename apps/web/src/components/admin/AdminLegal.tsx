"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

type LegalType = "privacy" | "terms";

interface LegalData {
  title: string;
  content: string;
  updatedAt?: string;
}

const defaultData: LegalData = { title: "", content: "" };

export default function AdminLegal() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const [tab, setTab] = useState<LegalType>("privacy");
  const [data, setData] = useState<Record<LegalType, LegalData>>({
    privacy: { ...defaultData },
    terms: { ...defaultData },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTab = useCallback(async (type: LegalType) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/legal/${type}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData((prev) => ({ ...prev, [type]: { title: d.title ?? "", content: d.content ?? "", updatedAt: d.updatedAt } }));
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => fetchTab(tab)); }, [tab, fetchTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/legal/${tab}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data[tab]),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData((prev) => ({ ...prev, [tab]: { ...prev[tab], updatedAt: d.updatedAt } }));
      toast.success(t("legalSaved"));
    } catch {
      toast.error(t("legalError"));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof LegalData, value: string) =>
    setData((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: value } }));

  const tabs: { type: LegalType; label: string }[] = [
    { type: "privacy", label: t("legalPrivacyTab") },
    { type: "terms",   label: t("legalTermsTab") },
  ];

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

  return (
    <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("legalTitle")}</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-gray-700 dark:bg-gray-800/40">
        {tabs.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              tab === type
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Editor card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-red-500">{t("legalError")}</p>
        ) : (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("legalFieldTitle")} *
              </label>
              <input
                type="text"
                value={data[tab].title}
                onChange={(e) => set("title", e.target.value)}
                className={inputClass}
                placeholder={tab === "privacy" ? t("legalPrivacyTab") : t("legalTermsTab")}
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("legalFieldContent")}
              </label>
              <textarea
                rows={20}
                value={data[tab].content}
                onChange={(e) => set("content", e.target.value)}
                className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                placeholder={t("legalEmpty")}
              />
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                {isRTL
                  ? "برای پاراگراف جدید یک خط خالی بگذارید."
                  : "Separate paragraphs with a blank line."}
              </p>
            </div>

            {/* Footer: last updated + save */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              {data[tab].updatedAt ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("legalLastUpdated")}:{" "}
                  {new Date(data[tab].updatedAt!).toLocaleDateString(
                    isRTL ? "fa-IR" : "en-US",
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                </p>
              ) : (
                <span />
              )}
              <button
                onClick={handleSave}
                disabled={saving || !data[tab].title.trim()}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-all disabled:opacity-60"
              >
                {saving ? t("legalSaving") : t("legalSave")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
