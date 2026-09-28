"use client";

import { useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import { useBooking, BOOKING_STEPS } from "./BookingProvider";
import StepServices from "./StepServices";
import StepStylist from "./StepStylist";
import StepDateTime from "./StepDateTime";
import StepContact from "./StepContact";
import StepOtp from "./StepOtp";
import StepSummary from "./StepSummary";
import StepSuccess from "./StepSuccess";

const STEP_TITLES: Record<(typeof BOOKING_STEPS)[number], string> = {
  services: "انتخاب خدمات",
  stylist: "انتخاب متخصص",
  datetime: "انتخاب زمان",
  contact: "اطلاعات تماس",
  otp: "تایید شماره موبایل",
  summary: "تایید نهایی",
  success: "رزرو موفق",
};

export default function BookingSheet() {
  const { isOpen, close, step, goBack, canGoBack } = useBooking();

  // The page (and its map) must not scroll behind the open sheet.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const stepIndex = BOOKING_STEPS.indexOf(step);
  const progressPercent = ((stepIndex + 1) / BOOKING_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="رزرو نوبت">
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-app-card sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-g-line p-4">
          {canGoBack ? (
            <button type="button" onClick={goBack} aria-label="مرحله قبل" className="rounded-full p-1.5 hover:bg-white/5">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <span className="w-7" />
          )}
          <h2 className="text-sm font-bold">{STEP_TITLES[step]}</h2>
          <button type="button" onClick={close} aria-label="بستن" className="rounded-full p-1.5 hover:bg-white/5">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {step !== "success" && (
          <div className="h-1 w-full bg-white/5">
            <div
              className="h-full rounded-e-full transition-all"
              style={{ width: `${progressPercent}%`, backgroundColor: "var(--salon-brand)" }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {step === "services" && <StepServices />}
          {step === "stylist" && <StepStylist />}
          {step === "datetime" && <StepDateTime />}
          {step === "contact" && <StepContact />}
          {step === "otp" && <StepOtp />}
          {step === "summary" && <StepSummary />}
          {step === "success" && <StepSuccess />}
        </div>
      </div>
    </div>
  );
}
