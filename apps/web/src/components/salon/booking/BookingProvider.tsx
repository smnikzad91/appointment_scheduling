"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Salon, Booking } from "@/types/salon";

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
}

const INITIAL_STATE: BookingState = {
  serviceIds: [],
  stylistId: null,
  dateKey: null,
  startMinute: null,
  customerName: "",
  customerPhone: "",
  accessToken: null,
};

interface BookingContextValue {
  salon: Salon;
  isOpen: boolean;
  step: BookingStep;
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

export function BookingProvider({ salon, children }: { salon: Salon; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("services");
  const [state, setState] = useState<BookingState>(INITIAL_STATE);
  const [result, setResult] = useState<Booking | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setStep("services");
    setResult(null);
  }, []);

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

  const stepIndex = BOOKING_STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(stepIndex + 1, BOOKING_STEPS.length - 1);
    setStep(BOOKING_STEPS[nextIndex]);
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = Math.max(stepIndex - 1, 0);
    setStep(BOOKING_STEPS[prevIndex]);
  }, [stepIndex]);

  const value = useMemo<BookingContextValue>(
    () => ({
      salon,
      isOpen,
      step,
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
    [salon, isOpen, step, state, result, open, openWithService, close, goNext, goBack, stepIndex, updateState, toggleService],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
