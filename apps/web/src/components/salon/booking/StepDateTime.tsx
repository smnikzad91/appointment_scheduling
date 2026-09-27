"use client";

import { useEffect, useState } from "react";
import { useBooking } from "./BookingProvider";
import { getAvailableSlots } from "@/lib/api/slots";
import { getUpcomingDays } from "@/lib/jalali";
import type { Salon, TimeSlot } from "@/types/salon";
import DateStrip from "./DateStrip";
import TimeSlotGrid from "./TimeSlotGrid";

export default function StepDateTime() {
  const { salon, state, updateState, goNext } = useBooking();
  const dateKey = state.dateKey ?? getUpcomingDays(1)[0].dateKey;

  function selectDate(nextDateKey: string) {
    updateState({ dateKey: nextDateKey, startMinute: null });
  }

  function selectMinute(startMinute: number) {
    updateState({ dateKey, startMinute });
  }

  return (
    <div className="flex flex-col gap-4">
      <DateStrip selectedDateKey={dateKey} onSelect={selectDate} />

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

  useEffect(() => {
    let cancelled = false;
    getAvailableSlots({ salon, stylistId, serviceIds, dateKey }).then((result) => {
      if (!cancelled) setSlots(result);
    });
    return () => {
      cancelled = true;
    };
  }, [salon, stylistId, serviceIds, dateKey]);

  if (slots === null) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return <TimeSlotGrid slots={slots} selectedMinute={selectedMinute} onSelect={onSelect} />;
}
