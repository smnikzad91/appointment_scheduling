"use client";

import type { DateStripDay } from "@/lib/jalali";
import { iranHoliday } from "@/lib/iranHolidays";

export default function DateStrip({
  days,
  selectedDateKey,
  onSelect,
}: {
  days: DateStripDay[];
  selectedDateKey: string | null;
  onSelect: (dateKey: string) => void;
}) {

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="انتخاب روز">
      {days.map((day) => {
        const isSelected = day.dateKey === selectedDateKey;
        // official holidays look like Fridays; the salon may still be open, so they stay selectable
        const holiday = iranHoliday(day.dateKey);
        return (
          <button
            key={day.dateKey}
            type="button"
            role="option"
            aria-selected={isSelected}
            title={holiday ?? undefined}
            onClick={() => onSelect(day.dateKey)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs ${
              (day.isWeekend || holiday) && !isSelected ? "text-rose-500 " : ""
            } ${isSelected ? "border-transparent text-white" : "border-g-line"}`}
            style={isSelected ? { backgroundColor: "var(--salon-brand)" } : undefined}
          >
            <span className="font-medium">{day.isToday ? "امروز" : day.weekdayName}</span>
            <span className="text-sm font-bold">{day.jalaliDay}</span>
            <span>{holiday ? "تعطیل" : day.jalaliMonth}</span>
          </button>
        );
      })}
    </div>
  );
}
