"use client";

import { CalendarPlus } from "lucide-react";
import { useBooking } from "./booking/BookingProvider";

export default function StickyBookButton() {
  const { open, isOpen } = useBooking();

  if (isOpen) return null;

  return (
    // floats just above the guest tab bar (62px + safe area, phones only)
    <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 border-t border-app-line bg-app-bg/95 p-3 backdrop-blur sm:hidden">
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-lg"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden />
        رزرو نوبت
      </button>
    </div>
  );
}
