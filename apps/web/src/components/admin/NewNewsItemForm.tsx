"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import SelectField from "@/components/admin/SelectField";
import { toast } from "sonner";

export default function NewNewsItemForm() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/news/tags")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data.map((t: { name: string }) => (t.name || "").replace(/^#/, "")) : []));
  }, []);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: "",
    title: "",
    body: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    highlight: false,
    published: true,
  });

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const addHashtag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, "");
    if (tag && !hashtags.includes(tag)) setHashtags((prev) => [...prev, tag]);
    setHashtagInput("");
  };
  const removeHashtag = (tag: string) => setHashtags((prev) => prev.filter((h) => h !== tag));
  const onHashtagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addHashtag(hashtagInput); }
  };

  const uploadImage = async (file: File) => {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "news");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setImage(data.url);
      else toast.error(data.error ?? "Upload failed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "news");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setCoverImage(data.url);
      else toast.error(data.error ?? "Upload failed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hashtags, image: image || undefined, coverImage: coverImage || undefined }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    toast.success(t("newsSaved"));
    setTimeout(() => router.push("/admin/news"), 800);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("newsNewItemTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("newsNewItemDesc")}</p>
        </div>
        {form.highlight && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            {t("newsFieldIsNew")}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>{t("newsFieldTitle")}</label>
              <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder={t("newsFieldTitlePlaceholder")} />
            </div>
            <div>
              <label className={labelClass}>{t("newsFieldCategory")}</label>
              <SelectField value={form.category} onChange={(v) => set("category", v)} options={categories} placeholder={t("newsFieldCategoryPlaceholder")} />
            </div>
            <div>
              <label className={labelClass}>{t("newsFieldDate")}</label>
              <input type="date" required value={form.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} className={inputClass} dir="ltr" />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>{t("newsFieldCoverImage")}</label>
            <input
              type="file"
              accept="image/*"
              disabled={coverUploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
              className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-400 disabled:opacity-50"
            />
            {coverUploading && <p className="mt-1 text-xs text-gray-400">{t("newsFieldCoverImageUploading")}</p>}
            {coverImage && !coverUploading && (
              <div className="mt-2 relative inline-block">
                <img src={coverImage} alt="" className="h-32 w-auto rounded-xl border border-gray-200 object-cover dark:border-gray-700" />
                <button type="button" onClick={() => setCoverImage("")}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white hover:bg-red-600">
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className={labelClass}>{t("newsFieldImage")}</label>
            <input
              type="file"
              accept="image/*"
              disabled={imageUploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
              className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-400 disabled:opacity-50"
            />
            {imageUploading && <p className="mt-1 text-xs text-gray-400">{t("newsFieldImageUploading")}</p>}
            {image && !imageUploading && (
              <div className="mt-2 relative inline-block">
                <img src={image} alt="" className="h-32 w-auto rounded-xl border border-gray-200 object-cover dark:border-gray-700" />
                <button type="button" onClick={() => setImage("")}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white hover:bg-red-600">
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className={`relative inline-flex cursor-pointer items-center gap-3${isRTL ? " flex-row-reverse" : ""}`}>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {form.published ? t("newsFieldPublished") : t("newsDraft")}
              </span>
              <div className={`relative inline-flex cursor-pointer items-center${isRTL ? " scale-x-[-1]" : ""}`}>
                <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="peer sr-only" />
                <div className="h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-full dark:bg-gray-600 dark:peer-checked:bg-orange-500" />
              </div>
            </label>
            <label className={`inline-flex cursor-pointer items-center gap-2${isRTL ? " flex-row-reverse" : ""}`}>
              <input type="checkbox" checked={form.highlight} onChange={(e) => set("highlight", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("newsFieldIsNew")}</span>
            </label>
          </div>

          <div>
            <label className={labelClass}>{t("newsFieldBody")}</label>
            <textarea required rows={5} value={form.body} onChange={(e) => set("body", e.target.value)} className={inputClass} placeholder={t("newsFieldBodyPlaceholder")} />
          </div>

          <div>
            <label className={labelClass}>{t("newsFieldHashtag")}</label>
            <input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value.replace(/^#/, ""))}
              onKeyDown={onHashtagKey}
              onBlur={() => hashtagInput.trim() && addHashtag(hashtagInput)}
              className={inputClass}
              placeholder={t("newsFieldHashtagPlaceholder")}
              dir={isRTL ? "rtl" : "ltr"}
            />
            {hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    #{tag.replace(/^#/, "")}
                    <button type="button" onClick={() => removeHashtag(tag)} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-300">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50">
            {saving ? t("newsSavingItem") : t("newsSaveItem")}
          </button>
          <button type="button" onClick={() => router.push("/admin/news")} className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
            {t("newsCancelItem")}
          </button>
        </div>
      </form>
    </div>
  );
}
