"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Salon, Booking } from "@/types/salon";
import type { ServiceLocation } from "@/lib/independent";
import { useBackgroundDraft } from "@/lib/useBackgroundDraft";
import { trackBookingEvent } from "@/lib/analytics/client";

export type BookingStep = "services" | "stylist" | "datetime" | "contact" | "otp" | "summary" | "success";

export const BOOKING_STEPS: BookingStep[] = ["services", "stylist", "datetime", "contact", "otp", "summary", "success"];

interface BookingState {
  serviceIds: string[];
  stylistId: string | null;
  dateKey: string | null;
  startMinute: number | null;
  customerFirstName: string;
  customerLastName: string;
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
  customerFirstName: "",
  customerLastName: "",
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
  /** This salon's steps (an independent stylist has no "choose a stylist" step; a signed-in
   * customer has no name/phone/code steps). */
  steps: BookingStep[];
  /** Booking with the signed-in customer's own account (NextAuth session token). */
  signedIn: boolean;
  /** Their token was refused (expired): ask for name, phone and code after all. */
  dropSignedIn: () => void;
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
  // A customer signed in on the site books with their own account: no name, phone or SMS code.
  // (Staff accounts can't book online — they keep the form and book with a customer number.)
  const { data: session } = useSession();
  const [signedInRefused, setSignedInRefused] = useState(false);
  const signedInToken = !signedInRefused && session?.user?.role === "CUSTOMER" ? session.apiAccessToken ?? null : null;
  const signedIn = !!signedInToken;
  // An independent stylist is the only stylist: nothing to choose.
  const steps = useMemo(
    () =>
      BOOKING_STEPS.filter((s) => !(independent && s === "stylist") && !(signedIn && (s === "contact" || s === "otp"))),
    [independent, signedIn],
  );
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
    trackBookingEvent("booking_open");
  }, [reset]);

  const openWithService = useCallback(
    (serviceId: string, stylistId?: string) => {
      reset();
      setState((s) => ({ ...s, serviceIds: [serviceId], stylistId: stylistId ?? null }));
      setIsOpen(true);
      trackBookingEvent("booking_open");
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

  // If the OS kills the app while the customer is in another app (checking their calendar, the
  // SMS code), bring them back to the same step with the same choices — also over a prefilled
  // sheet (short link, «رزرو دوباره»): the draft is what they did after it. A finished booking
  // isn't brought back.
  useBackgroundDraft<{ step: BookingStep; state: BookingState }>(
    `booking:${salon.slug}`,
    () => (isOpen && step !== "success" ? { step, state } : null),
    (draft) => {
      if (!steps.includes(draft.step)) return;
      const afterOtp = steps.includes("otp") && steps.indexOf(draft.step) > steps.indexOf("otp");
      setState({ ...initialState, ...draft.state });
      setStep(afterOtp && !draft.state.accessToken ? "contact" : draft.step);
      setIsOpen(true);
    },
  );

  // The session arrived (or its token was refused) while on a step that no longer exists.
  const currentStep: BookingStep = steps.includes(step) ? step : signedIn ? "summary" : "contact";
  const stepIndex = steps.indexOf(currentStep);

  const dropSignedIn = useCallback(() => {
    setSignedInRefused(true);
    setState((s) => ({ ...s, accessToken: null }));
    setStep("contact");
  }, []);

  // the signed-in customer's token stands in for the one the code step would give
  const effectiveState = useMemo(() => (signedInToken && !state.accessToken ? { ...state, accessToken: signedInToken } : state), [state, signedInToken]);

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
      step: currentStep,
      steps,
      signedIn,
      dropSignedIn,
      state: effectiveState,
      result,
      open,
      openWithService,
      close,
      goNext,
      goBack,
      canGoBack: stepIndex > 0 && currentStep !== "success",
      updateState,
      setResult,
      toggleService,
    }),
    [salon, isOpen, currentStep, steps, signedIn, dropSignedIn, effectiveState, result, open, openWithService, close, goNext, goBack, stepIndex, updateState, toggleService],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
