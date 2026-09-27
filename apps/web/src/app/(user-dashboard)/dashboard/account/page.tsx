"use client";

import { useState } from "react";
import { useT } from "@/i18n/useT";
import { toast } from "sonner";

export default function AccountSettingsPage() {
  const t = useT();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.next !== form.confirm) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (form.next.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    setSaving(true);
    const res  = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      toast.success(t("passwordUpdated"));
      setForm({ current: "", next: "", confirm: "" });
    } else {
      toast.error(data.error || t("saveError"));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("accountSettingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("accountSettingsDesc2")}
        </p>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-6 text-base font-semibold text-gray-800 dark:text-white">
          {t("changePassword")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("currentPassword")}
            </label>
            <input
              type="password"
              name="current"
              value={form.current}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("newPassword")}
            </label>
            <input
              type="password"
              name="next"
              value={form.next}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("confirmNewPassword")}
            </label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {saving ? t("saving") : t("updatePassword")}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-error-200 bg-white p-6 dark:border-error-800 dark:bg-gray-900">
        <h2 className="mb-2 text-base font-semibold text-error-600 dark:text-error-400">
          {t("dangerZone")}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("dangerZoneDesc")}
        </p>
        <button className="rounded-lg border border-error-300 px-4 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-700 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors">
          {t("deleteAccount")}
        </button>
      </div>
    </div>
  );
}
