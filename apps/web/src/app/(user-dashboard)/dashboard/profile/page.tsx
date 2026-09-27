"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfilePage() {
  const t = useT();
  const { lang } = useLanguage();
  const { data: session, update } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const sessionName  = session?.user?.name  ?? "";
  const sessionEmail = session?.user?.email ?? "";
  const avatar       = session?.user?.avatar || "/images/user/user-01.jpg";
  const [firstName, lastName] = sessionName.split(" ");

  const [phone, setPhone]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (d.phone !== undefined) setPhone(d.phone); })
      .catch(() => {});
  }, []);

  const IRANIAN_MOBILE = /^09[0-9]{9}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone !== "" && !IRANIAN_MOBILE.test(phone)) {
      toast.error(t("phoneInvalid"));
      return;
    }

    setSaving(true);

    const res  = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();

    if (res.ok) {
      toast.success(t("saved"));
    } else {
      toast.error(data.error || t("saveError"));
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);

    const res  = await fetch("/api/user/avatar", { method: "POST", body: fd });
    const data = await res.json();

    if (res.ok) {
      await update({ avatar: data.avatar });
      toast.success(t("avatarUpdated"));
    } else {
      toast.error(data.error || t("uploadError"));
    }

    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profileTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("profileDesc")}</p>
      </div>

      {/* Avatar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
          {t("avatarSection")}
        </h2>
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
            <Image src={avatar} alt="Avatar" width={80} height={80} className="h-full w-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {uploading ? t("uploading") : t("changePhoto")}
            </button>
            <p className="mt-1.5 text-xs text-gray-400">{t("photoHint")}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Personal info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-6 text-base font-semibold text-gray-800 dark:text-white">
          {t("personalInfo")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("firstName")}
              </label>
              <input
                defaultValue={firstName}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("lastName")}
              </label>
              <input
                defaultValue={lastName}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("emailAddress")}
            </label>
            <input
              type="email"
              defaultValue={sessionEmail}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("phone")}
            </label>
            <input
              type="tel"
              dir={lang === "fa" ? "rtl" : "ltr"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {saving ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
