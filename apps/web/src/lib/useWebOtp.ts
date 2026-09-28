"use client";

import { useEffect, useRef } from "react";

/**
 * While `active`, asks the browser (Chrome on Android, via the WebOTP API) to read the code from
 * the incoming SMS — the message must end with "@<this site's host> #<code>" (see the API's
 * SMS_OTP_DOMAIN). Does nothing where the API is missing; iOS offers the code through the
 * keyboard instead, from autocomplete="one-time-code".
 */
export function useWebOtp(active: boolean, onCode: (code: string) => void) {
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as (Credential & { code?: string }) | null)?.code;
        if (code) onCodeRef.current(code);
      })
      .catch(() => {}); // aborted, timed out or denied: the user types the code
    return () => ac.abort();
  }, [active]);
}
