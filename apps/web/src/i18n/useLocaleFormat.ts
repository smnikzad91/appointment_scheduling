"use client";

import { useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { persianApiError } from "@/lib/api/errorMessages";
import { toPersianDigits } from "@/lib/persian";
import { DEFAULT_SALON_TIME_ZONE, formatSalonDate } from "@/lib/salonTime";

/**
 * Number/date/error formatting that follows the admin panel's language (the only bilingual area):
 * Persian digits and Jalali dates in fa, Latin digits and Gregorian dates in en.
 */
export function useLocaleFormat() {
  const { lang } = useLanguage();
  const fa = lang === "fa";
  const num = useCallback((n: number | string) => (fa ? toPersianDigits(n) : String(n)), [fa]);
  const date = useCallback(
    (iso: string) =>
      fa ? formatSalonDate(iso) : new Date(iso).toLocaleDateString("en-US", { timeZone: DEFAULT_SALON_TIME_ZONE, dateStyle: "medium" }),
    [fa],
  );
  /** API errors: the Persian mapping in fa; in en the API's own (English) message. */
  const apiError = useCallback(
    (err: unknown, fallback: string) => {
      if (fa) return persianApiError(err, fallback);
      const message = typeof err === "object" && err !== null ? (err as { message?: string }).message : undefined;
      return message || fallback;
    },
    [fa],
  );
  return { lang, num, date, apiError };
}
