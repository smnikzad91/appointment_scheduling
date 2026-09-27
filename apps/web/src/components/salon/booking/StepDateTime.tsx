"use client";

import { useEffect, useState } from "react";
import { useBooking } from "./BookingProvider";
import { getAvailableSlots } from "@/lib/api/slots";
import { dateKeyToDate, getUpcomingDays } from "@/lib/jalali";
import { toSalonWallTime } from "@/lib/salonTime";
import type { Salon, TimeSlot } from "@/types/salon";
import DateStrip from "./DateStrip";
import TimeSlotGrid from "./TimeSlotGrid";
import WaitlistButton from "./WaitlistButton";

export default function StepDateTime() {
  const { salon, state, updateState, goNext } = useBooking();
  // "Today" is the salon's today, not the browser's — the API computes slots in salon time.
  const days = getUpcomingDays(14, dateKeyToDate(toSalonWallTime(new Date(), salon.timezone).dateKey));
  const dateKey = state.dateKey ?? days[0].dateKey;

  function selectDate(nextDateKey: string) {
    updateState({ dateKey: nextDateKey, startMinute: null });
  }

  function selectMinute(startMinute: number) {
    updateState({ dateKey, startMinute });
  }

  return (
    <div className="flex flex-col gap-4">
      <DateStrip days={days} selectedDateKey={dateKey} onSelect={selectDate} />

      <SlotsPanel
        // Remounts (and so resets its own loading state) whenever the query changes.
        key={`${dateKey}-${state.stylistId ?? "any"}-${state.serviceIds.join(",")}`}
        salon={salon}
        stylistId={state.stylistId}
        serviceIds={state.serviceIds}
        dateKey={dateKey}
        selectedMinute={state.startMinute}
        onSelect={selectMinute}
      />

      <button
        type="button"
        disabled={state.startMinute === null}
        onClick={goNext}
        className="rounded-full py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        ادامه
      </button>
    </div>
  );
}

function SlotsPanel({
  salon,
  stylistId,
  serviceIds,
  dateKey,
  selectedMinute,
  onSelect,
}: {
  salon: Salon;
  stylistId: string | null;
  serviceIds: string[];
  dateKey: string;
  selectedMinute: number | null;
  onSelect: (minute: number) => void;
}) {
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAvailableSlots({ salon, stylistId, serviceIds, dateKey })
      .then((result) => {
        if (!cancelled) setSlots(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [salon, stylistId, serviceIds, dateKey, attempt]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
        دریافت زمان‌های خالی ممکن نشد.
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="text-xs font-medium underline"
          style={{ color: "var(--salon-brand)" }}
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (slots === null) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <TimeSlotGrid
      slots={slots}
      selectedMinute={selectedMinute}
      onSelect={onSelect}
      fullDayAction={<WaitlistButton slug={salon.slug} dateKey={dateKey} serviceIds={serviceIds} stylistId={stylistId} />}
    />
  );
}
