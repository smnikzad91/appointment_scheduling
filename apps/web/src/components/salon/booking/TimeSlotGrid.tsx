import type { TimeSlot, PartOfDay } from "@/types/salon";
import { formatMinutesAsClock } from "@/lib/persian";
import { groupSlotsByPartOfDay, PART_OF_DAY_LABEL } from "@/lib/api/slots";

const ORDER: PartOfDay[] = ["morning", "noon", "evening"];

export default function TimeSlotGrid({
  slots,
  selectedMinute,
  onSelect,
  fullDayAction,
}: {
  slots: TimeSlot[];
  selectedMinute: number | null;
  onSelect: (minute: number) => void;
  /** Shown under the "no free time" message on a working day that's fully booked. */
  fullDayAction?: React.ReactNode;
}) {
  const groups = groupSlotsByPartOfDay(slots);
  const hasAnySlot = slots.length > 0;
  const hasAvailableSlot = slots.some((s) => s.available);

  if (!hasAnySlot) {
    return <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">این روز تعطیل است.</p>;
  }

  if (!hasAvailableSlot) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
        برای این روز زمان خالی وجود ندارد. روز دیگری را انتخاب کنید.
        {fullDayAction}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((part) => {
        if (groups[part].length === 0) return null;
        return (
          <div key={part}>
            <h4 className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{PART_OF_DAY_LABEL[part]}</h4>
            <div className="grid grid-cols-4 gap-2">
              {groups[part].map((slot) => {
                const isSelected = slot.startMinute === selectedMinute;
                return (
                  <button
                    key={slot.startMinute}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onSelect(slot.startMinute)}
                    aria-pressed={isSelected}
                    className={`rounded-lg border py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-30 ${
                      isSelected ? "border-transparent text-white" : "border-gray-200 dark:border-gray-800"
                    }`}
                    style={isSelected ? { backgroundColor: "var(--salon-brand)" } : undefined}
                  >
                    {formatMinutesAsClock(slot.startMinute)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
