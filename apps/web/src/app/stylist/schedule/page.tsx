"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Check, Copy, Plus, Trash2 } from "lucide-react";
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
import { PERSIAN_WEEKDAY_NAMES, WEEK_ORDER_SATURDAY_FIRST, dateKeyToDate, formatJalaliFull } from "@/lib/jalali";
import { addDaysToDateKey, formatSalonDate, salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import Sheet from "@/components/app/Sheet";
import { Button, EmptyState, ErrorBanner, Field, IconButton, ListGroup, ListSkeleton, PageHeader, SectionTitle, TextInput, Toggle, cx } from "@/components/app/ui";
import PickerSelect from "@/components/app/PickerSelect";
import TimePicker from "@/components/app/TimePicker";
import { toastError } from "@/lib/toastError";

interface DayRow {
  open: boolean;
  startMinute: number;
  endMinute: number;
}

const DEFAULT_ROW: DayRow = { open: false, startMinute: 9 * 60, endMinute: 18 * 60 };
const TIME_OFF_DAYS_AHEAD = 120;

// Persian-digit time choices in 30-minute steps (the booking slot size). Native <input type="time">
// renders "09:00 AM" in Latin digits on many phones, which is out of place in a Persian app.
const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => i * 30);

function TimeSelect({ value, onChange, label }: { value: number; onChange: (minute: number) => void; label: string }) {
  return <TimePicker compact value={value} onChange={onChange} options={TIME_OPTIONS} free={null} label={label} />;
}

export default function StylistSchedulePage() {
  const token = useApiAccessToken();
  const [days, setDays] = useState<Record<number, DayRow> | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({ start: "", end: "", reason: "" });
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    Promise.all([getMyStylistProfile(token), listMyTimeOff(token)])
      .then(([profile, off]) => {
        setLoadError(null);
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
      })
      .catch(() => setLoadError("خطا در دریافت اطلاعات"));
  }, [token]);

  useEffect(reload, [reload]);

  // Selectable days for time off, labelled in the Jalali calendar (native date inputs are Gregorian).
  const dayOptions = useMemo(() => {
    const today = toSalonWallTime(new Date()).dateKey;
    return Array.from({ length: TIME_OFF_DAYS_AHEAD }, (_, i) => {
      const key = addDaysToDateKey(today, i);
      return { key, label: i === 0 ? `امروز — ${formatJalaliFull(dateKeyToDate(key))}` : formatJalaliFull(dateKeyToDate(key)) };
    });
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DayRow>) {
    setDays((d) => (d ? { ...d, [dayOfWeek]: { ...d[dayOfWeek], ...patch } } : d));
    setDirty(true);
    setSaved(false);
  }

  function copyToOpenDays(source: number) {
    if (!days) return;
    const { startMinute, endMinute } = days[source];
    setDays(Object.fromEntries(Object.entries(days).map(([d, row]) => [d, row.open ? { ...row, startMinute, endMinute } : row])));
    setDirty(true);
    setSaved(false);
  }

  async function handleSaveHours() {
    if (!token || !days) return;
    const invalid = Object.values(days).some((row) => row.open && row.endMinute <= row.startMinute);
    if (invalid) {
      toastError("ساعت پایان هر روز باید بعد از ساعت شروع باشد");
      return;
    }
    setSaving(true);
    try {
      const hours: WorkingHourEntry[] = Object.entries(days)
        .filter(([, row]) => row.open)
        .map(([dayOfWeek, row]) => ({ dayOfWeek: Number(dayOfWeek), startMinute: row.startMinute, endMinute: row.endMinute }));
      await setMyWorkingHours(token, hours);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      toastError("ذخیره ساعات کاری انجام نشد، دوباره تلاش کنید");
    } finally {
      setSaving(false);
    }
  }

  function openTimeOff() {
    const first = dayOptions[0].key;
    setNewTimeOff({ start: first, end: first, reason: "" });
    setTimeOffOpen(true);
  }

  async function handleAddTimeOff() {
    if (!token || !newTimeOff.start || !newTimeOff.end) return;
    if (newTimeOff.end < newTimeOff.start) {
      toastError("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد");
      return;
    }
    setAddingTimeOff(true);
    try {
      // Whole salon-local days: from midnight of the first day to midnight after the last day.
      await createMyTimeOff(token, {
        startAt: salonWallTimeToInstant(newTimeOff.start, 0).toISOString(),
        endAt: salonWallTimeToInstant(addDaysToDateKey(newTimeOff.end, 1), 0).toISOString(),
        reason: newTimeOff.reason.trim() || undefined,
      });
      setTimeOffOpen(false);
      reload();
    } catch {
      toastError("ثبت مرخصی انجام نشد");
    } finally {
      setAddingTimeOff(false);
    }
  }

  async function handleDeleteTimeOff(entry: TimeOffEntry) {
    if (!token || !confirm("این مرخصی حذف شود؟")) return;
    try {
      await deleteMyTimeOff(token, entry.id);
      reload();
    } catch {
      setLoadError("حذف مرخصی انجام نشد");
    }
  }

  if (!days || !timeOff) {
    return loadError ? <ErrorBanner onRetry={reload}>{loadError}</ErrorBanner> : <ListSkeleton rows={7} />;
  }

  const upcomingTimeOff = timeOff.filter((t) => new Date(t.endAt) > new Date()).sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <>
      <PageHeader title="ساعات کاری" subtitle="مشتری‌ها فقط در همین ساعت‌ها می‌توانند با شما نوبت بگیرند." />

      {loadError && <ErrorBanner onRetry={reload}>{loadError}</ErrorBanner>}

      <ListGroup>
        {WEEK_ORDER_SATURDAY_FIRST.map((dayOfWeek) => {
          const row = days[dayOfWeek];
          return (
            <div key={dayOfWeek} className="px-4 py-3">
              <div className="flex h-8 items-center justify-between">
                <span className={cx("text-[15px] font-bold", row.open ? "text-app-ink" : "text-app-muted")}>
                  {PERSIAN_WEEKDAY_NAMES[dayOfWeek]}
                  {!row.open && <span className="ms-2 text-xs font-medium">تعطیل</span>}
                </span>
                <Toggle checked={row.open} onChange={(open) => updateDay(dayOfWeek, { open })} label={`${PERSIAN_WEEKDAY_NAMES[dayOfWeek]} کار می‌کنم`} />
              </div>
              {row.open && (
                <div className="mt-3 flex items-center gap-2">
                  <TimeSelect
                    label={`شروع ${PERSIAN_WEEKDAY_NAMES[dayOfWeek]}`}
                    value={row.startMinute}
                    onChange={(startMinute) => updateDay(dayOfWeek, { startMinute })}
                  />
                  <span className="text-sm text-app-muted">تا</span>
                  <TimeSelect
                    label={`پایان ${PERSIAN_WEEKDAY_NAMES[dayOfWeek]}`}
                    value={row.endMinute}
                    onChange={(endMinute) => updateDay(dayOfWeek, { endMinute })}
                  />
                  <button
                    type="button"
                    onClick={() => copyToOpenDays(dayOfWeek)}
                    aria-label={`اعمال ساعت ${PERSIAN_WEEKDAY_NAMES[dayOfWeek]} به همه روزهای کاری`}
                    title="اعمال به همه روزهای کاری"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-card-2 text-app-muted active:scale-90"
                  >
                    <Copy className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </ListGroup>
      <p className="mt-2 px-1 text-xs leading-6 text-app-muted">
        با دکمه <Copy className="inline h-3.5 w-3.5" aria-hidden /> ساعت همان روز روی همه روزهای کاری اعمال می‌شود.
      </p>

      {/* Save bar — only while there's something to save (or right after saving). */}
      {(dirty || saved) && (
        <div className="app-rise sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mt-4">
          <Button block busy={saving} icon={saved ? Check : undefined} onClick={handleSaveHours} className="shadow-[0_12px_30px_-12px_rgb(0_0_0/0.45)]">
            {saved ? "ذخیره شد" : "ذخیره ساعات کاری"}
          </Button>
        </div>
      )}

      <SectionTitle action={<IconButton icon={Plus} label="ثبت مرخصی" onClick={openTimeOff} tone="plain" />}>مرخصی‌ها</SectionTitle>
      {upcomingTimeOff.length === 0 ? (
        <EmptyState icon={CalendarOff} title="مرخصی پیش‌رویی ندارید" hint="روزهایی که نیستید را ثبت کنید تا در آن روزها نوبتی برایتان ثبت نشود." />
      ) : (
        <ListGroup>
          {upcomingTimeOff.map((t) => {
            const lastDay = formatSalonDate(new Date(new Date(t.endAt).getTime() - 1));
            const firstDay = formatSalonDate(t.startAt);
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
                  <CalendarOff className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-app-ink">{firstDay === lastDay ? firstDay : `${firstDay} تا ${lastDay}`}</p>
                  {t.reason && <p className="truncate text-xs text-app-muted">{t.reason}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTimeOff(t)}
                  aria-label="حذف مرخصی"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-app-muted active:bg-app-danger/10 active:text-app-danger"
                >
                  <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            );
          })}
        </ListGroup>
      )}

      <Sheet
        open={timeOffOpen}
        onClose={() => setTimeOffOpen(false)}
        title="ثبت مرخصی"
        footer={
          <Button block busy={addingTimeOff} onClick={handleAddTimeOff}>
            ثبت مرخصی
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="از روز">
            <PickerSelect
              title="از روز"
              value={newTimeOff.start}
              options={dayOptions.map((d) => ({ value: d.key, label: d.label }))}
              onChange={(start) => setNewTimeOff((f) => ({ ...f, start, end: f.end < start ? start : f.end }))}
            />
          </Field>
          <Field label="تا روز (خود این روز هم شامل مرخصی است)">
            <PickerSelect
              title="تا روز"
              value={newTimeOff.end}
              options={dayOptions.filter((d) => d.key >= newTimeOff.start).map((d) => ({ value: d.key, label: d.label }))}
              onChange={(end) => setNewTimeOff((f) => ({ ...f, end }))}
            />
          </Field>
          <Field label="دلیل (اختیاری)">
            <TextInput value={newTimeOff.reason} onChange={(e) => setNewTimeOff((f) => ({ ...f, reason: e.target.value }))} placeholder="مثلاً سفر" />
          </Field>
        </div>
      </Sheet>
    </>
  );
}
