"use client";

import { useState } from "react";
import { useBooking } from "./BookingProvider";
import { formatToman, formatMinutesAsClock, toPersianDigits } from "@/lib/persian";
import { formatJalaliFull, dateKeyToDate } from "@/lib/jalali";
import { createBooking } from "@/lib/api/bookings";
import { SalonApiError } from "@/lib/api/salonApiClient";

export default function StepSummary() {
  const { salon, state, setResult, goNext } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const stylist = salon.stylists.find((s) => s.id === state.stylistId);
  const stylistPricingByServiceId = new Map(stylist?.services.map((s) => [s.serviceId, s]));

  // When a specific stylist is chosen, show their exact price/duration (which may be
  // overridden); otherwise fall back to the salon's base pricing as an estimate — the
  // actual amount is finalized server-side once a stylist is auto-assigned.
  const services = salon.services
    .filter((s) => state.serviceIds.includes(s.id))
    .map((s) => {
      const pricing = stylistPricingByServiceId.get(s.id);
      return { ...s, priceToman: pricing?.priceToman ?? s.priceToman, durationMinutes: pricing?.durationMinutes ?? s.durationMinutes };
    });
  const totalPrice = services.reduce((sum, s) => sum + s.priceToman, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  async function handleConfirm() {
    if (!state.dateKey || state.startMinute === null || !state.accessToken) return;
    setError(null);
    setConfirming(true);
    try {
      const booking = await createBooking({
        salon,
        serviceIds: state.serviceIds,
        stylistId: state.stylistId,
        dateKey: state.dateKey,
        startMinute: state.startMinute,
        accessToken: state.accessToken,
      });
      setResult(booking);
      goNext();
    } catch (err) {
      setError(err instanceof SalonApiError ? err.message : "خطایی رخ داد، دوباره تلاش کنید");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 text-sm dark:border-gray-800">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">خدمات</span>
          <ul className="mt-1 flex flex-col gap-1">
            {services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span>{formatToman(s.priceToman)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">متخصص</span>
          <span>{stylist ? stylist.displayName : "فرقی نمی‌کند"}</span>
        </div>

        {state.dateKey && (
          <div className="flex justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">تاریخ و ساعت</span>
            <span>
              {formatJalaliFull(dateKeyToDate(state.dateKey))} ساعت {formatMinutesAsClock(state.startMinute ?? 0)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">مدت زمان</span>
          <span>{toPersianDigits(totalDuration)} دقیقه</span>
        </div>

        <div className="flex justify-between border-t border-gray-100 pt-3 font-bold dark:border-gray-800">
          <span>مبلغ قابل پرداخت</span>
          <span>{formatToman(totalPrice)}</span>
        </div>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming}
        className="rounded-full py-3 text-sm font-bold text-white transition disabled:opacity-60"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        {confirming ? "در حال ثبت..." : "تایید نهایی رزرو"}
      </button>
    </div>
  );
}
