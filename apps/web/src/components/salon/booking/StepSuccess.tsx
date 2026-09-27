"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, CalendarPlus, CalendarCheck } from "lucide-react";
import { useBooking } from "./BookingProvider";
import { buildIcsFile } from "@/lib/ics";
import { dateKeyToDate, formatJalaliFull } from "@/lib/jalali";
import { formatMinutesAsClock, splitFullName } from "@/lib/persian";
import { saveCustomerSession } from "@/lib/customerSession";

export default function StepSuccess() {
  const { salon, state, result, close } = useBooking();

  useEffect(() => {
    if (state.accessToken) {
      saveCustomerSession({ token: state.accessToken, firstName: splitFullName(state.customerName).firstName });
    }
    // Only ever needs to run once, right when the success screen mounts with a fresh token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  const services = salon.services.filter((s) => result.serviceIds.includes(s.id));
  const start = dateKeyToDate(result.date);
  start.setMinutes(result.startMinute);

  function handleAddToCalendar() {
    const ics = buildIcsFile({
      title: `نوبت ${salon.name}`,
      description: services.map((s) => s.name).join("، "),
      location: salon.address,
      start,
      durationMinutes: result!.endMinute - result!.startMinute,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "booking.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
      <div>
        <h3 className="text-lg font-bold">نوبت شما ثبت شد!</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {formatJalaliFull(start)} ساعت {formatMinutesAsClock(result.startMinute)}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAddToCalendar}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-800"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          افزودن به تقویم
        </button>
        <Link
          href="/my-bookings"
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-800"
        >
          <CalendarCheck className="h-4 w-4" aria-hidden />
          نوبت‌های من
        </Link>
      </div>

      <button
        type="button"
        onClick={close}
        className="w-full rounded-full py-3 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        متوجه شدم
      </button>
    </div>
  );
}
