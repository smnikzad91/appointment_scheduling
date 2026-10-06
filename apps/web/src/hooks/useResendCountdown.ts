"use client";

import { useCallback, useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

/** apps/api allows one OTP per phone per minute (OTP_RESEND_COOLDOWN_SECONDS). */
export const OTP_RESEND_SECONDS = 60;

/** Seconds left before a new code may be requested; starts counting on mount (a code was just sent). */
export function useResendCountdown(seconds = OTP_RESEND_SECONDS) {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const restart = useCallback(() => setDeadline(Date.now() + seconds * 1000), [seconds]);
  return { secondsLeft: left, restart };
}

/** "۰:۴۵" */
export function formatCountdown(seconds: number) {
  return toPersianDigits(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`);
}
