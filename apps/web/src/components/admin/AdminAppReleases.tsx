"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

// /admin/app-releases («نسخه‌های اپ»): upload the signed `direct` APK from CI, check what it says
// about itself, publish it (→ /app-version.json, /download/…, /download-app), mark it mandatory, or
// delete an unpublished one. Plus the Bazaar / Myket links of /download-app.

interface Release {
  id: string;
  versionCode: number;
  versionName: string;
  fileName: string;
  sha256: string;
  size: number;
  certSha256: string | null;
  notes: string;
  published: boolean;
  mandatory: boolean;
  createdAt: string;
  publishedAt: string | null;
  uploader: string | null;
  downloads: number;
}
interface Links { bazaarUrl: string | null; bazaarComingSoon: boolean; myketUrl: string | null; myketComingSoon: boolean }

const MB = 1024 * 1024;

export default function AdminAppReleases() {
  const t = useT();
  const { num, date } = useLocaleFormat();
  const [rows, setRows] = useState<Release[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; versionName: string; notes: string } | null>(null);
  // the new-release form (like devtrader.ir's): the version fields are checked against the APK on the server
  const [form, setForm] = useState({ versionName: "", versionCode: "", updateType: "optional" as "optional" | "mandatory", notes: "", publish: true });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/admin/app-releases").then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]));
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error(t("arChooseApk"));
    if (file.size > 150 * MB) return toast.error(t("arTooBig"));
    if (form.updateType === "mandatory" && form.publish && !window.confirm(t("arConfirmMandatory"))) return;
    setWarning(null);
    setProgress(0);
    // raw body (not multipart): the server streams it to disk; the form fields go as headers; XHR for progress
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/app-releases");
    xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");
    if (form.versionName.trim()) xhr.setRequestHeader("X-Version-Name", encodeURIComponent(form.versionName.trim()));
    if (form.versionCode.trim()) xhr.setRequestHeader("X-Version-Code", form.versionCode.trim());
    xhr.setRequestHeader("X-Update-Type", form.updateType);
    if (form.notes.trim()) xhr.setRequestHeader("X-Notes", encodeURIComponent(form.notes.trim()));
    if (form.publish) xhr.setRequestHeader("X-Publish", "1");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let d: { error?: string; signatureWarning?: string | null } = {};
      try { d = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 413 && !d.error) return toast.error(t("arTooBigServer"));
      if (xhr.status >= 400) return toast.error(d.error ?? t("saveError"));
      toast.success(form.publish ? t("arUploadedPublished") : t("arUploaded"));
      if (d.signatureWarning) setWarning(d.signatureWarning);
      setForm({ versionName: "", versionCode: "", updateType: "optional", notes: "", publish: true });
      setFile(null);
      load();
    };
    xhr.onerror = () => { setProgress(null); toast.error(t("saveError")); };
    xhr.send(file);
  }

  async function patch(r: Release, body: object, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(r.id);
    const res = await fetch(`/api/admin/app-releases/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? t("saveError"));
    load();
    return true;
  }

  async function remove(r: Release) {
    if (!window.confirm(t("arConfirmDelete"))) return;
    setBusy(r.id);
    const res = await fetch(`/api/admin/app-releases/${r.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? t("saveError"));
    load();
  }

  const latestPublished = rows?.find((r) => r.published)?.id;
  const btn = "rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50";
  const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
  const label = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";
  const typePill = (mandatory: boolean) => (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${mandatory ? "border-error-400 text-error-600 dark:text-error-400" : "border-blue-light-400 text-blue-light-600 dark:text-blue-light-400"}`}>
      {mandatory ? t("arTypeMandatory") : t("arTypeOptional")}
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("arTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("arDesc")}</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t("arUpload")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={label}>{t("arVersionName")}</span>
            <input dir="ltr" value={form.versionName} onChange={(e) => setForm({ ...form, versionName: e.target.value })} placeholder="1.2.0" className={input} />
          </label>
          <label className="block">
            <span className={label}>{t("arVersionCode")}</span>
            <input dir="ltr" inputMode="numeric" value={form.versionCode} onChange={(e) => setForm({ ...form, versionCode: e.target.value.replace(/\D/g, "") })} placeholder="12" className={input} />
          </label>
          <label className="block">
            <span className={label}>{t("arUpdateType")}</span>
            <select value={form.updateType} onChange={(e) => setForm({ ...form, updateType: e.target.value as "optional" | "mandatory" })} className={input}>
              <option value="optional">{t("arTypeOptionalLong")}</option>
              <option value="mandatory">{t("arTypeMandatoryLong")}</option>
            </select>
          </label>
          <div>
            <span className={label}>{t("arApkFile")}</span>
            <input ref={fileRef} type="file" accept=".apk,application/vnd.android.package-archive" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${file ? "border-brand-500 text-gray-800 dark:text-white" : "border-gray-300 text-gray-500 hover:border-brand-400 dark:border-gray-700"}`}
            >
              <span dir="ltr" className="max-w-full truncate">{file ? `${file.name} — ${num((file.size / MB).toFixed(1))} MB` : t("arChooseApk")}</span>
            </button>
          </div>
          <label className="block md:col-span-2">
            <span className={label}>{t("arNotes")}</span>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("arNotesPlaceholder")} className={input} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} />
          {t("arPublishNow")}
        </label>
        <p className="text-xs leading-6 text-gray-500">{t("arUploadHelp")}</p>
        {progress !== null && (
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
        )}
        <button type="submit" disabled={progress !== null} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          {progress !== null ? `${t("arUploading")} ${num(progress)}٪` : form.publish ? t("arSubmitPublish") : t("arSubmitUpload")}
        </button>
        {warning && <p className="rounded-xl bg-warning-50 p-3 text-xs leading-6 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">{warning}</p>}
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">{t("arReleases")}</h2>
        {!rows ? (
          <p className="text-sm text-gray-400">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400">{t("arNone")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  {(["arColVersion", "arColType", "arColNotes", "arColSize", "arColDownloads", "arColPublished", "arColSha", "arColActions"] as const).map((k) => (
                    <th key={k} className="whitespace-nowrap px-3 py-2.5 text-start font-medium">{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 align-top dark:divide-gray-800">
                {rows.map((r) => (
                  <tr key={r.id} className={busy === r.id ? "opacity-50" : ""}>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white" dir="ltr">{r.versionName}</span>{" "}
                      <span className="text-xs text-gray-400" dir="ltr">({r.versionCode})</span>
                      {r.id === latestPublished && <span className="ms-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{t("arLatestBadge")}</span>}
                      {!r.published && <p className="mt-1 text-xs text-gray-400">{t("arDraft")}</p>}
                    </td>
                    <td className="px-3 py-3">{typePill(r.mandatory)}</td>
                    <td className="px-3 py-3">
                      <span title={r.notes} className="block max-w-[260px] truncate text-xs text-gray-600 dark:text-gray-300">{r.notes || "—"}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-300" dir="ltr">{num((r.size / MB).toFixed(1))} MB</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{num(r.downloads)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                      <p>{r.publishedAt ? date(r.publishedAt) : "—"}</p>
                      {r.uploader && <p className="text-gray-400">{r.uploader}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <button title={r.sha256} onClick={() => navigator.clipboard.writeText(r.sha256).then(() => toast.success(t("copied")))} dir="ltr" className="font-mono text-xs text-gray-700 hover:text-brand-500 dark:text-gray-300">
                        {r.sha256.slice(0, 10)}…
                      </button>
                      {r.certSha256 && <p dir="ltr" className="mt-1 font-mono text-[10px] text-gray-400" title={r.certSha256}>cert {r.certSha256.slice(0, 11)}…</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.published && (
                          <a href={`/download/${r.fileName}`} className={`${btn} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300`}>{t("arDownload")}</a>
                        )}
                        {r.published ? (
                          <button disabled={busy === r.id} onClick={() => patch(r, { published: false }, t("arConfirmUnpublish"))} className={`${btn} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300`}>{t("arUnpublish")}</button>
                        ) : (
                          <button disabled={busy === r.id} onClick={() => patch(r, { published: true }, t("arConfirmPublish"))} className={`${btn} bg-success-500 text-white hover:bg-success-600`}>{t("arPublish")}</button>
                        )}
                        <button
                          disabled={busy === r.id}
                          onClick={() => patch(r, { mandatory: !r.mandatory }, r.mandatory ? undefined : t("arConfirmMandatory"))}
                          className={`${btn} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300`}
                        >
                          {r.mandatory ? t("arMakeOptional") : t("arMakeMandatory")}
                        </button>
                        <button disabled={busy === r.id} onClick={() => setEditing({ id: r.id, versionName: r.versionName, notes: r.notes })} className={`${btn} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300`}>{t("arEdit")}</button>
                        {!r.published && <button disabled={busy === r.id} onClick={() => remove(r)} className={`${btn} border border-error-200 text-error-600`}>{t("arDelete")}</button>}
                      </div>
                      {editing?.id === r.id && (
                        <div className="mt-2 space-y-2">
                          <input dir="ltr" value={editing.versionName} onChange={(e) => setEditing({ ...editing, versionName: e.target.value })} className="w-40 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                          <textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder={t("arNotesPlaceholder")} className="w-full min-w-56 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                          <div className="flex gap-2">
                            <button onClick={async () => { if (await patch(r, { versionName: editing.versionName, notes: editing.notes })) setEditing(null); }} className={`${btn} bg-brand-500 text-white`}>{t("arSave")}</button>
                            <button onClick={() => setEditing(null)} className={`${btn} text-gray-500`}>{t("cancel")}</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StoreLinks />
    </div>
  );
}

function StoreLinks() {
  const t = useT();
  const [links, setLinks] = useState<Links | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/app-releases/store-links").then((r) => r.json()).then(setLinks).catch(() => {});
  }, []);
  if (!links) return null;

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/app-releases/store-links", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(links) });
    setSaving(false);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? t("saveError"));
    setLinks(await res.json());
    toast.success(t("arLinksSaved"));
  }

  const field = (store: "bazaar" | "myket", label: string) => {
    const urlKey = `${store}Url` as const;
    const soonKey = `${store}ComingSoon` as const;
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <input dir="ltr" value={links[urlKey] ?? ""} onChange={(e) => setLinks({ ...links, [urlKey]: e.target.value })} placeholder="https://" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={links[soonKey]} onChange={(e) => setLinks({ ...links, [soonKey]: e.target.checked })} />
          {t("arComingSoon")}
        </label>
      </div>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{t("arStores")}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t("arStoresHelp")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {field("bazaar", t("arBazaar"))}
        {field("myket", t("arMyket"))}
      </div>
      <button onClick={save} disabled={saving} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{t("arSave")}</button>
    </section>
  );
}
