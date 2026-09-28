"use client";

import { CalendarPlus } from "lucide-react";
import { useBooking } from "./booking/BookingProvider";

export default function StickyBookButton() {
  const { open, isOpen } = useBooking();

  if (isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-bg/95 p-3 backdrop-blur sm:hidden">
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
