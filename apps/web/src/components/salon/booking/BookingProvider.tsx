"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Salon, Booking } from "@/types/salon";
import type { ServiceLocation } from "@/lib/independent";

export type BookingStep = "services" | "stylist" | "datetime" | "contact" | "otp" | "summary" | "success";

export const BOOKING_STEPS: BookingStep[] = ["services", "stylist", "datetime", "contact", "otp", "summary", "success"];

interface BookingState {
  serviceIds: string[];
  stylistId: string | null;
  dateKey: string | null;
  startMinute: number | null;
  customerName: string;
  customerPhone: string;
  accessToken: string | null; // set once OTP verification succeeds
  /** The code, when the API hands it back (no SMS provider yet) — StepOtp then verifies by itself. */
  devCode: string | null;
  /** Independent stylists: where it happens (one of theirs) and, for a home visit, the address. */
  serviceLocation: ServiceLocation | null;
  visitAddress: string;
}

const INITIAL_STATE: BookingState = {
  serviceIds: [],
  stylistId: null,
  dateKey: null,
  startMinute: null,
  customerName: "",
  customerPhone: "",
  accessToken: null,
  devCode: null,
  serviceLocation: null,
  visitAddress: "",
};

interface BookingContextValue {
  salon: Salon;
  isOpen: boolean;
  step: BookingStep;
  /** This salon's steps (an independent stylist has no "choose a stylist" step). */
  steps: BookingStep[];
  state: BookingState;
  result: Booking | null;
  open: () => void;
  openWithService: (serviceId: string, stylistId?: string) => void;
  close: () => void;
  goNext: () => void;
  goBack: () => void;
  canGoBack: boolean;
  updateState: (patch: Partial<BookingState>) => void;
  setResult: (booking: Booking) => void;
  toggleService: (serviceId: string) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

/** Open the sheet straight away with these choices ("book again", or a waitlist notice's day). */
export interface BookingPrefill {
  serviceIds: string[];
  stylistId: string | null;
  dateKey: string | null;
}

export function BookingProvider({ salon, prefill, children }: { salon: Salon; prefill?: BookingPrefill | null; children: React.ReactNode }) {
  const independent = salon.kind === "INDEPENDENT";
  // An independent stylist is the only stylist: nothing to choose.
  const steps = useMemo(() => (independent ? BOOKING_STEPS.filter((s) => s !== "stylist") : BOOKING_STEPS), [independent]);
  // The only place they work needs no choice either.
  const initialState = useMemo<BookingState>(
    () => ({ ...INITIAL_STATE, serviceLocation: independent && salon.serviceLocations.length === 1 ? salon.serviceLocations[0] : null }),
    [independent, salon.serviceLocations],
  );
  const [isOpen, setIsOpen] = useState(!!prefill);
  // With services already chosen, start at the day/time step; back still reaches the earlier ones.
  const [step, setStep] = useState<BookingStep>(prefill?.serviceIds.length ? "datetime" : "services");
  const [state, setState] = useState<BookingState>(() =>
    prefill ? { ...initialState, serviceIds: prefill.serviceIds, stylistId: prefill.stylistId, dateKey: prefill.dateKey } : initialState,
  );
  const [result, setResult] = useState<Booking | null>(null);

  const reset = useCallback(() => {
    setState(initialState);
    setStep("services");
    setResult(null);
  }, [initialState]);

  const open = useCallback(() => {
    reset();
    setIsOpen(true);
  }, [reset]);

  const openWithService = useCallback(
    (serviceId: string, stylistId?: string) => {
      reset();
      setState((s) => ({ ...s, serviceIds: [serviceId], stylistId: stylistId ?? null }));
      setIsOpen(true);
    },
    [reset],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const toggleService = useCallback((serviceId: string) => {
    setState((s) => ({
      ...s,
      serviceIds: s.serviceIds.includes(serviceId) ? s.serviceIds.filter((id) => id !== serviceId) : [...s.serviceIds, serviceId],
    }));
  }, []);

  const updateState = useCallback((patch: Partial<BookingState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const stepIndex = steps.indexOf(step);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    setStep(steps[nextIndex]);
  }, [stepIndex, steps]);

  const goBack = useCallback(() => {
    const prevIndex = Math.max(stepIndex - 1, 0);
    setStep(steps[prevIndex]);
  }, [stepIndex, steps]);

  const value = useMemo<BookingContextValue>(
    () => ({
      salon,
      isOpen,
      step,
      steps,
      state,
      result,
      open,
      openWithService,
      close,
      goNext,
      goBack,
      canGoBack: stepIndex > 0 && step !== "success",
      updateState,
      setResult,
      toggleService,
    }),
    [salon, isOpen, step, steps, state, result, open, openWithService, close, goNext, goBack, stepIndex, updateState, toggleService],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
