"use client";

import { useCallback, useEffect, useState } from "react";
import { useBooking } from "./BookingProvider";
import { formatToman, formatMinutesAsClock, toPersianDigits } from "@/lib/persian";
import { formatJalaliFull, dateKeyToDate } from "@/lib/jalali";
import { createBooking } from "@/lib/api/bookings";
import { persianApiError } from "@/lib/api/errorMessages";
import { placeLabel } from "@/lib/independent";
import { toastError } from "@/lib/toastError";
import { SalonApiError } from "@/lib/api/salonApiClient";
import { getWallet, prepaymentOf, type WalletInfo } from "@/lib/api/wallet";
import WalletTopUp from "@/components/app/WalletTopUp";

// Online bookings pre-pay part of the price (50%) from the customer's wallet — the only way to pay.
// Short of balance, the sheet offers a top-up of the difference right here and waits for it.
const MIN_TOP_UP_TOMAN = 10_000;

export default function StepSummary() {
  const { salon, state, updateState, setResult, goNext } = useBooking();
  // An independent stylist working in more than one place: the customer picks where.
  const places = salon.kind === "INDEPENDENT" ? salon.serviceLocations : [];
  const homeVisit = state.serviceLocation === "CLIENT_HOME";
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

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  // couldn't read it: let the booking go — the server checks the balance itself (402)
  const [walletFailed, setWalletFailed] = useState(false);
  const loadWallet = useCallback(() => {
    if (!state.accessToken) return;
    getWallet(state.accessToken)
      .then((w) => { setWallet(w); setWalletFailed(false); })
      .catch(() => setWalletFailed(true));
  }, [state.accessToken]);
  useEffect(() => { queueMicrotask(loadWallet); }, [loadWallet]);
  const prepay = wallet ? prepaymentOf(totalPrice, wallet.prepaymentPercent) : 0;
  const short = wallet ? Math.max(0, prepay - wallet.balanceToman) : 0;

  async function handleConfirm() {
    if (!state.dateKey || state.startMinute === null || !state.accessToken) return;
    if (places.length > 1 && !state.serviceLocation) return toastError("محل انجام نوبت را انتخاب کنید");
    if (homeVisit && state.visitAddress.trim().length < 5) return toastError("نشانی محل خدمت در منزل را وارد کنید");
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
      // 402: the actual price (an auto-assigned stylist's) needs more than the balance — show the top-up
      if (err instanceof SalonApiError && err.status === 402) loadWallet();
      toastError(persianApiError(err));
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
          <span>مبلغ کل</span>
          <span>{formatToman(totalPrice)}</span>
        </div>
        {wallet && prepay > 0 && (
          <>
            <div className="flex justify-between font-bold">
              <span>پیش‌پرداخت از کیف پول ({toPersianDigits(wallet.prepaymentPercent)}٪)</span>
              <span>{formatToman(prepay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-g-muted">پرداخت در محل</span>
              <span>{formatToman(totalPrice - prepay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-g-muted">موجودی کیف پول</span>
              <span>{formatToman(wallet.balanceToman)}</span>
            </div>
            <p className="text-xs leading-6 text-g-faint">
              {!stylist && "مبلغ نهایی با آرایشگری که تعیین می‌شود قطعی می‌شود. "}
              اگر نوبت لغو شود، پیش‌پرداخت کامل به کیف پول شما برمی‌گردد.
            </p>
          </>
        )}
      </div>

      {short > 0 && state.accessToken && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-g-ink">موجودی کیف پول برای پیش‌پرداخت کافی نیست؛ حداقل {formatToman(short)} شارژ کنید.</p>
          <WalletTopUp accessToken={state.accessToken} suggestedToman={Math.max(MIN_TOP_UP_TOMAN, Math.ceil(short / 1000) * 1000)} onPaid={loadWallet} />
        </div>
      )}

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


      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming || (!wallet && !walletFailed) || short > 0}
        className="rounded-full py-3 text-sm font-bold text-white transition disabled:opacity-60"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        {confirming ? "در حال ثبت..." : !wallet && !walletFailed ? "در حال بررسی کیف پول..." : short > 0 ? "اول کیف پول را شارژ کنید" : prepay > 0 ? `پرداخت ${formatToman(prepay)} از کیف پول و ثبت رزرو` : "تایید نهایی رزرو"}
      </button>
    </div>
  );
}
