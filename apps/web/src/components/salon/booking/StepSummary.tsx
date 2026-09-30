"use client";

import { useState } from "react";
import { useBooking } from "./BookingProvider";
import { formatToman, formatMinutesAsClock, toPersianDigits } from "@/lib/persian";
import { formatJalaliFull, dateKeyToDate } from "@/lib/jalali";
import { createBooking } from "@/lib/api/bookings";
import { persianApiError } from "@/lib/api/errorMessages";
import { placeLabel } from "@/lib/independent";

export default function StepSummary() {
  const { salon, state, updateState, setResult, goNext } = useBooking();
  // An independent stylist working in more than one place: the customer picks where.
  const places = salon.kind === "INDEPENDENT" ? salon.serviceLocations : [];
  const homeVisit = state.serviceLocation === "CLIENT_HOME";
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
    if (places.length > 1 && !state.serviceLocation) return setError("محل انجام نوبت را انتخاب کنید");
    if (homeVisit && state.visitAddress.trim().length < 5) return setError("نشانی محل خدمت در منزل را وارد کنید");
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
        serviceLocation: state.serviceLocation,
        visitAddress: state.visitAddress.trim(),
      });
      setResult(booking);
      goNext();
    } catch (err) {
      setError(persianApiError(err));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-g-line p-4 text-sm">
        <div>
          <span className="text-xs text-g-muted">خدمات</span>
          <ul className="mt-1 flex flex-col gap-1">
            {services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span>{formatToman(s.priceToman)}</span>
              </li>
            ))}
          </ul>
        </div>

        {salon.kind !== "INDEPENDENT" && (
          <div className="flex justify-between border-t border-g-line pt-3">
            <span className="text-xs text-g-muted">متخصص</span>
            <span>{stylist ? stylist.displayName : "فرقی نمی‌کند"}</span>
          </div>
        )}
        {places.length === 1 && (
          <div className="flex justify-between border-t border-g-line pt-3">
            <span className="text-xs text-g-muted">محل</span>
            <span>{placeLabel(places[0], salon.hostSalonName)}</span>
          </div>
        )}

        {state.dateKey && (
          <div className="flex justify-between">
            <span className="text-xs text-g-muted">تاریخ و ساعت</span>
            <span>
              {formatJalaliFull(dateKeyToDate(state.dateKey))} ساعت {formatMinutesAsClock(state.startMinute ?? 0)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-xs text-g-muted">مدت زمان</span>
          <span>{toPersianDigits(totalDuration)} دقیقه</span>
        </div>

        <div className="flex justify-between border-t border-g-line pt-3 font-bold">
          <span>مبلغ قابل پرداخت</span>
          <span>{formatToman(totalPrice)}</span>
        </div>
      </div>

      {places.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-g-muted">نوبت کجا انجام شود؟</p>
          <div role="radiogroup" aria-label="محل انجام نوبت" className="flex flex-wrap gap-2">
            {places.map((loc) => {
              const on = state.serviceLocation === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => updateState({ serviceLocation: loc })}
                  className={`rounded-full border px-3.5 py-2 text-sm transition ${on ? "font-bold text-white" : "border-g-line text-g-ink"}`}
                  style={on ? { backgroundColor: "var(--salon-brand)", borderColor: "var(--salon-brand)" } : undefined}
                >
                  {placeLabel(loc, salon.hostSalonName)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {homeVisit && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-g-muted">نشانی شما برای خدمات در منزل</span>
          <textarea
            rows={2}
            maxLength={300}
            value={state.visitAddress}
            onChange={(e) => updateState({ visitAddress: e.target.value })}
            placeholder="شهر، خیابان، کوچه، پلاک، طبقه"
            className="rounded-lg border border-g-line bg-transparent px-3 py-2 text-base text-g-ink outline-none focus:border-g-line-strong"
          />
          {salon.serviceArea && <span className="text-xs text-g-faint">محدوده خدمات در منزل: {salon.serviceArea}</span>}
          <span className="text-xs text-g-faint">فقط {salon.name} این نشانی را می‌بیند.</span>
        </label>
      )}

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
