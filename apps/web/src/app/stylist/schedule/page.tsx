"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  getMyStylistProfile,
  setMyWorkingHours,
  listMyTimeOff,
  createMyTimeOff,
  deleteMyTimeOff,
  type WorkingHourEntry,
  type TimeOffEntry,
} from "@/lib/api/stylistSelf";
import { PERSIAN_WEEKDAY_NAMES, WEEK_ORDER_SATURDAY_FIRST } from "@/lib/jalali";
import { SalonApiError } from "@/lib/api/salonApiClient";

interface DayRow {
  open: boolean;
  startMinute: number;
  endMinute: number;
}

function minutesToTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

const DEFAULT_ROW: DayRow = { open: false, startMinute: 9 * 60, endMinute: 18 * 60 };

export default function StylistSchedulePage() {
  const token = useApiAccessToken();
  const [days, setDays] = useState<Record<number, DayRow> | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newTimeOff, setNewTimeOff] = useState({ startAt: "", endAt: "", reason: "" });

  function reload() {
    if (!token) return;
    Promise.all([getMyStylistProfile(token), listMyTimeOff(token)]).then(([profile, off]) => {
      const byDay = new Map(profile.workingHours.map((h) => [h.dayOfWeek, h]));
      setDays(
        Object.fromEntries(
          WEEK_ORDER_SATURDAY_FIRST.map((d) => {
            const existing = byDay.get(d);
            return [d, existing ? { open: true, startMinute: existing.startMinute, endMinute: existing.endMinute } : { ...DEFAULT_ROW }];
          }),
        ),
      );
      setTimeOff(off);
    });
  }

  useEffect(reload, [token]);

  async function handleSaveHours() {
    if (!token || !days) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const hours: WorkingHourEntry[] = Object.entries(days)
        .filter(([, row]) => row.open)
        .map(([dayOfWeek, row]) => ({ dayOfWeek: Number(dayOfWeek), startMinute: row.startMinute, endMinute: row.endMinute }));
      await setMyWorkingHours(token, hours);
      setSaved(true);
    } catch (err) {
      setError(err instanceof SalonApiError ? err.message : "خطا در ذخیره ساعات کاری");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newTimeOff.startAt || !newTimeOff.endAt) return;
    await createMyTimeOff(token, {
      startAt: new Date(newTimeOff.startAt).toISOString(),
      endAt: new Date(newTimeOff.endAt).toISOString(),
      reason: newTimeOff.reason || undefined,
    });
    setNewTimeOff({ startAt: "", endAt: "", reason: "" });
    reload();
  }

  async function handleDeleteTimeOff(id: string) {
    if (!token) return;
    await deleteMyTimeOff(token, id);
    reload();
  }

  if (!days || !timeOff) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">ساعات کاری</h1>
        <p className="text-sm text-gray-500">روزها و ساعاتی که در دسترس هستید را مشخص کنید.</p>
      </div>

      <section className="max-w-xl">
        <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {WEEK_ORDER_SATURDAY_FIRST.map((dayOfWeek) => {
            const row = days[dayOfWeek];
            return (
              <div key={dayOfWeek} className="flex items-center gap-3 px-4 py-3">
                <label className="flex w-24 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) => setDays((d) => ({ ...d!, [dayOfWeek]: { ...row, open: e.target.checked } }))}
                  />
                  {PERSIAN_WEEKDAY_NAMES[dayOfWeek]}
                </label>
                {row.open && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={minutesToTimeInput(row.startMinute)}
                      onChange={(e) => setDays((d) => ({ ...d!, [dayOfWeek]: { ...row, startMinute: timeInputToMinutes(e.target.value) } }))}
                      className="rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-gray-400">تا</span>
                    <input
                      type="time"
                      value={minutesToTimeInput(row.endMinute)}
                      onChange={(e) => setDays((d) => ({ ...d!, [dayOfWeek]: { ...row, endMinute: timeInputToMinutes(e.target.value) } }))}
                      className="rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        {saved && <p className="mt-2 text-sm text-emerald-600">ساعات کاری ذخیره شد.</p>}

        <button
          type="button"
          onClick={handleSaveHours}
          disabled={saving}
          className="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "ذخیره ساعات کاری"}
        </button>
      </section>

      <section className="max-w-xl">
        <h2 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">مرخصی‌ها</h2>

        <ul className="mb-4 flex flex-col gap-2">
          {timeOff.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
              <span>
                {new Date(t.startAt).toLocaleDateString("fa-IR")} تا {new Date(t.endAt).toLocaleDateString("fa-IR")}
                {t.reason && <span className="text-gray-400"> — {t.reason}</span>}
              </span>
              <button type="button" onClick={() => handleDeleteTimeOff(t.id)} aria-label="حذف مرخصی">
                <Trash2 className="h-4 w-4 text-gray-400 hover:text-rose-500" aria-hidden />
              </button>
            </li>
          ))}
          {timeOff.length === 0 && <p className="text-sm text-gray-500">مرخصی‌ای ثبت نشده است.</p>}
        </ul>

        <form onSubmit={handleAddTimeOff} className="grid gap-3 sm:grid-cols-3">
          <input
            type="date"
            required
            value={newTimeOff.startAt}
            onChange={(e) => setNewTimeOff((f) => ({ ...f, startAt: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="date"
            required
            value={newTimeOff.endAt}
            onChange={(e) => setNewTimeOff((f) => ({ ...f, endAt: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex gap-2">
            <input
              value={newTimeOff.reason}
              onChange={(e) => setNewTimeOff((f) => ({ ...f, reason: e.target.value }))}
              placeholder="دلیل (اختیاری)"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
              ثبت
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
