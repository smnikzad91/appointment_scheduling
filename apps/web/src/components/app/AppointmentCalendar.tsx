"use client";

import { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { jalaliMonthPeriod } from "@/lib/accountingPeriod";
import { toDateKey } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import { PeriodSwitcher } from "./accounting";
import { AppointmentList, relativeDayLabel, type AppAppointment } from "./appointments";
import { EmptyState, cx } from "./ui";

// Month view of the appointments screen (salon and stylist panels): a Jalali month grid with
// each day's booking count (a dot when some still await confirmation), and the tapped day's
// appointments underneath using the same cards and action sheet as the list. Days are
// salon-local (toSalonWallTime), weeks run Saturday → Friday, Friday is the weekend.

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

interface Cell {
  dateKey: string;
  day: number;
  isFriday: boolean;
}

function monthCells(offset: number, todayKey: string) {
  const [y, m, d] = todayKey.split("-").map(Number);
  const first = new DateObject({ date: new Date(y, m - 1, d, 12), calendar: persian, locale: persian_fa }).setDay(1).add(offset, "month");
  const length = first.month.length;
  // JS getDay(): 0 = Sunday … 6 = Saturday → column 0 = Saturday.
  const lead = (first.toDate().getDay() + 1) % 7;
  const cells: (Cell | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < length; i++) {
    const date = new DateObject(first).add(i, "day").toDate();
    cells.push({ dateKey: toDateKey(date), day: i + 1, isFriday: date.getDay() === 5 });
  }
  return cells;
}

export default function AppointmentCalendar({
  appointments,
  showStylist,
  onOpen,
}: {
  appointments: AppAppointment[];
  showStylist?: boolean;
  onOpen: (a: AppAppointment) => void;
}) {
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(todayKey);

  const byDay = useMemo(() => {
    const map = new Map<string, AppAppointment[]>();
    for (const a of appointments) {
      const key = toSalonWallTime(new Date(a.startAt)).dateKey;
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [appointments]);

  const cells = useMemo(() => monthCells(offset, todayKey), [offset, todayKey]);
  const period = useMemo(() => jalaliMonthPeriod(offset), [offset]);
  const dayList = byDay.get(selected) ?? [];
  const active = dayList.filter((a) => a.status !== "CANCELLED");
  const monthTotal = cells.reduce((n, c) => n + (c ? (byDay.get(c.dateKey) ?? []).filter((a) => a.status !== "CANCELLED").length : 0), 0);

  const changeMonth = (next: number) => {
    setOffset(next);
    // Keep a day of the shown month selected: today in the current month, otherwise the 1st.
    const nextCells = monthCells(next, todayKey).filter((c): c is Cell => !!c);
    setSelected(nextCells.some((c) => c.dateKey === todayKey) ? todayKey : nextCells[0].dateKey);
  };

  return (
    <div>
      <PeriodSwitcher period={period} onChange={changeMonth} allowFuture />

      <div className="rounded-3xl border border-app-line bg-app-card p-3 shadow-app">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold text-app-muted" aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={cx("py-1", i === 6 && "text-app-danger/80")}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`تقویم نوبت‌های ${period.label}`}>
          {cells.map((c, i) => {
            if (!c) return <span key={`blank-${i}`} />;
            const items = (byDay.get(c.dateKey) ?? []).filter((a) => a.status !== "CANCELLED");
            const pending = items.some((a) => a.status === "PENDING");
            const isToday = c.dateKey === todayKey;
            const isSelected = c.dateKey === selected;
            const isPast = c.dateKey < todayKey;
            return (
              <button
                key={c.dateKey}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${relativeDayLabel(c.dateKey)}، ${items.length ? `${toPersianDigits(items.length)} نوبت` : "بدون نوبت"}${pending ? "، منتظر تایید دارد" : ""}`}
                onClick={() => setSelected(c.dateKey)}
                className={cx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-2xl text-[15px] transition active:scale-95",
                  isSelected ? "bg-app-ink text-app-bg" : isToday ? "bg-app-accent-soft text-app-accent ring-1 ring-app-accent/40" : "text-app-ink",
                  !isSelected && c.isFriday && "text-app-danger/80",
                  !isSelected && isPast && "opacity-60",
                )}
              >
                <span className={cx("leading-none", (isToday || isSelected) && "font-black")}>{toPersianDigits(c.day)}</span>
                {items.length > 0 && (
                  <span
                    className={cx(
                      "mt-1 min-w-[18px] rounded-full px-1 text-[10px] font-black leading-[16px]",
                      isSelected ? "bg-app-bg/20 text-app-bg" : "bg-app-accent text-app-accent-ink",
                    )}
                  >
                    {toPersianDigits(items.length)}
                  </span>
                )}
                {pending && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-app-pending" aria-hidden />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-app-line px-1 pt-2.5 text-[11px] text-app-muted">
          <span>
            {toPersianDigits(monthTotal)} نوبت در {period.label}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-app-pending" aria-hidden />
            منتظر تایید
          </span>
        </div>
      </div>

      <h3 className="mb-2 mt-5 px-1 text-[13px] font-black text-app-ink">
        {relativeDayLabel(selected)}
        <span className="ms-2 font-medium text-app-muted">{active.length ? `${toPersianDigits(active.length)} نوبت` : "بدون نوبت"}</span>
      </h3>
      {dayList.length === 0 ? (
        <EmptyState icon={CalendarX2} title="در این روز نوبتی نیست" />
      ) : (
        <AppointmentList appointments={dayList} showStylist={showStylist} onOpen={onOpen} order="asc" hideDayHeaders />
      )}
    </div>
  );
}
