"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { iranHoliday } from "@/lib/iranHolidays";
import { dateKeyToDate, toJalali } from "@/lib/jalali";
import { formatMinutesAsClock, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, toSalonWallTime } from "@/lib/salonTime";
import { STATUS_META, type AppAppointment, type AppointmentStatus } from "./appointments";
import { cx } from "./ui";

// Week view of the appointments screen: Saturday → Friday columns on an hour ruler, each booking a
// block sized by its duration and coloured by status, so busy and free hours read at a glance.
// Tap a block for the usual action sheet. Overlapping bookings (different stylists at the same
// time) split the column into lanes; owners can filter to one stylist. Salon-local wall time.

const HOUR_PX = 44;
const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const BLOCK: Record<AppointmentStatus, string> = {
  PENDING: "bg-app-pending text-white",
  CONFIRMED: "bg-app-accent text-app-accent-ink",
  COMPLETED: "bg-app-done text-white",
  NO_SHOW: "bg-app-danger/75 text-white",
  CANCELLED: "",
};

/** Saturday of the week containing `dateKey` (weeks run Saturday → Friday). */
function weekStart(dateKey: string) {
  const dow = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return addDaysToDateKey(dateKey, -((dow + 1) % 7));
}

interface Placed {
  a: AppAppointment;
  start: number;
  end: number;
  lane: number;
}

/** Greedy lanes so overlapping bookings sit side by side. */
function placeDay(items: AppAppointment[]): { placed: Placed[]; lanes: number } {
  const sorted = items
    .map((a) => {
      const s = toSalonWallTime(a.startAt);
      const e = toSalonWallTime(a.endAt);
      // a booking running past midnight is drawn to the end of its day
      return { a, start: s.minuteOfDay, end: e.dateKey === s.dateKey ? e.minuteOfDay : 24 * 60 };
    })
    .sort((x, y) => x.start - y.start);
  const laneEnds: number[] = [];
  const placed = sorted.map((p) => {
    let lane = laneEnds.findIndex((end) => end <= p.start);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = p.end;
    return { ...p, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

export default function AppointmentWeek({
  appointments,
  showStylist,
  onOpen,
}: {
  appointments: AppAppointment[];
  showStylist?: boolean;
  onOpen: (a: AppAppointment) => void;
}) {
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const [start, setStart] = useState(() => weekStart(todayKey));
  const [stylist, setStylist] = useState<string | null>(null);
  const [nowMinute, setNowMinute] = useState(() => toSalonWallTime(new Date()).minuteOfDay);

  // keep the "now" line moving while the screen is open
  useEffect(() => {
    const t = setInterval(() => setNowMinute(toSalonWallTime(new Date()).minuteOfDay), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToDateKey(start, i)), [start]);
  const stylists = useMemo(
    () => (showStylist ? [...new Set(appointments.map((a) => a.stylist?.displayName).filter((n): n is string => !!n))] : []),
    [appointments, showStylist],
  );

  const week = useMemo(() => {
    const inWeek = appointments.filter((a) => {
      if (a.status === "CANCELLED") return false;
      if (stylist && a.stylist?.displayName !== stylist) return false;
      const key = toSalonWallTime(a.startAt).dateKey;
      return key >= days[0] && key <= days[6];
    });
    const byDay = days.map((d) => placeDay(inWeek.filter((a) => toSalonWallTime(a.startAt).dateKey === d)));
    const all = byDay.flatMap((d) => d.placed);
    const from = Math.min(9, ...all.map((p) => Math.floor(p.start / 60)));
    const to = Math.max(21, ...all.map((p) => Math.ceil(p.end / 60)));
    return { byDay, count: all.length, from, to };
  }, [appointments, days, stylist]);

  const hours = Array.from({ length: week.to - week.from }, (_, i) => week.from + i);
  const first = toJalali(dateKeyToDate(days[0]));
  const last = toJalali(dateKeyToDate(days[6]));
  const label =
    first.month.number === last.month.number
      ? `${toPersianDigits(first.day)} تا ${toPersianDigits(last.day)} ${last.month.name}`
      : `${toPersianDigits(first.day)} ${first.month.name} تا ${toPersianDigits(last.day)} ${last.month.name}`;
  const isThisWeek = days.includes(todayKey);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-3xl border border-app-line bg-app-card p-1.5 shadow-app">
        {/* RTL: the earlier week sits on the right */}
        <button type="button" onClick={() => setStart(addDaysToDateKey(start, -7))} aria-label="هفته قبل" className="flex h-11 w-11 items-center justify-center rounded-2xl text-app-ink active:bg-app-card-2">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => setStart(weekStart(todayKey))} className="text-center" aria-label="برگشت به این هفته">
          <p className="text-[16px] font-black text-app-ink">{label}</p>
          <p className="text-[11px] font-medium text-app-muted">
            {isThisWeek ? "این هفته" : "برگشت به این هفته"}
            {" — "}
            {toPersianDigits(week.count)} نوبت
          </p>
        </button>
        <button type="button" onClick={() => setStart(addDaysToDateKey(start, 7))} aria-label="هفته بعد" className="flex h-11 w-11 items-center justify-center rounded-2xl text-app-ink active:bg-app-card-2">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {stylists.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="radiogroup" aria-label="آرایشگر">
          {[null, ...stylists].map((s) => (
            <button
              key={s ?? "all"}
              type="button"
              role="radio"
              aria-checked={stylist === s}
              onClick={() => setStylist(s)}
              className={cx(
                "h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition",
                stylist === s ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
              )}
            >
              {s ?? "همه آرایشگرها"}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-app-line bg-app-card shadow-app">
        {/* day headers */}
        <div className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] border-b border-app-line">
          <span />
          {days.map((d, i) => {
            const holiday = iranHoliday(d);
            const red = i === 6 || holiday;
            const today = d === todayKey;
            return (
              <div key={d} className={cx("flex flex-col items-center py-2", holiday && "bg-app-danger/[0.06]")} title={holiday ?? undefined}>
                <span className={cx("text-[11px] font-bold", red ? "text-app-danger" : "text-app-muted")}>{WEEKDAY_SHORT[i]}</span>
                <span
                  className={cx(
                    "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black",
                    today ? "bg-app-accent text-app-accent-ink" : red ? "text-app-danger" : "text-app-ink",
                  )}
                >
                  {toPersianDigits(toJalali(dateKeyToDate(d)).day)}
                </span>
              </div>
            );
          })}
        </div>

        {/* hour ruler + columns */}
        <div className="relative grid grid-cols-[34px_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
          <div className="relative">
            {hours.map((h, i) => (
              <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] font-medium text-app-muted" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : toPersianDigits(h)}
              </span>
            ))}
          </div>
          {days.map((d, di) => {
            const { placed, lanes } = week.byDay[di];
            return (
              <div key={d} className={cx("relative border-r border-app-line/70", iranHoliday(d) && "bg-app-danger/[0.04]")}>
                {hours.map((h, i) => (
                  <span key={h} aria-hidden className="absolute inset-x-0 border-t border-app-line/60" style={{ top: i * HOUR_PX }} />
                ))}
                {d === todayKey && nowMinute >= week.from * 60 && nowMinute <= week.to * 60 && (
                  <span aria-hidden className="absolute inset-x-0 z-20 h-0.5 bg-app-danger" style={{ top: ((nowMinute - week.from * 60) / 60) * HOUR_PX }}>
                    <span className="absolute -right-1 -top-[3px] h-2 w-2 rounded-full bg-app-danger" />
                  </span>
                )}
                {placed.map(({ a, start: s, end: e, lane }) => {
                  const top = ((s - week.from * 60) / 60) * HOUR_PX;
                  const height = Math.max(16, ((e - s) / 60) * HOUR_PX - 2);
                  const who = a.customer ? `${a.customer.firstName} ${a.customer.lastName}`.trim() : "";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a)}
                      aria-label={`${formatMinutesAsClock(s)} تا ${formatMinutesAsClock(e)}${who ? `، ${who}` : ""}${a.stylist ? `، ${a.stylist.displayName}` : ""}، ${STATUS_META[a.status].label}`}
                      className={cx("absolute z-10 overflow-hidden rounded-md px-0.5 text-start shadow-sm ring-1 ring-app-card transition active:scale-95", BLOCK[a.status])}
                      style={{ top: top + 1, height, right: `${(lane / lanes) * 100}%`, width: `calc(${100 / lanes}% - 2px)` }}
                    >
                      {height >= 28 && lanes === 1 && <span className="block text-[9px] font-black leading-tight">{formatMinutesAsClock(s)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-app-muted">
        {(["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cx("h-2.5 w-2.5 rounded-[3px]", BLOCK[s])} aria-hidden />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}
