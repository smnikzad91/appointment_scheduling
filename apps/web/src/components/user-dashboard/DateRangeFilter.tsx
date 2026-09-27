"use client";

import DatePicker, { type Value } from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/i18n/useT";

// Renders a Jalali (Persian) calendar for the fa locale and a Gregorian
// calendar for en, while the value it hands back to the parent is always a
// plain Gregorian "YYYY-MM-DD" string — so callers can keep doing simple
// `new Date(from)` range comparisons without caring which calendar the user
// picked from.
function toISODate(value: Value): string {
  if (!value || Array.isArray(value)) return "";
  const d = value instanceof DateObject ? value.toDate() : new Date(value as string);
  if (Number.isNaN(d.getTime())) return "";
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNativeDate(iso: string): Date | "" {
  return iso ? new Date(`${iso}T00:00:00`) : "";
}

export default function DateRangeFilter({
  from, to, onFromChange, onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const { lang } = useLanguage();
  const isRTL    = lang === "fa";
  const { theme } = useTheme();
  const t        = useT();

  const calendar = isRTL ? persian : gregorian;
  const locale   = isRTL ? persian_fa : gregorian_en;

  const inputClasses = "w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors";

  const clear = () => { onFromChange(""); onToChange(""); };

  return (
    <div className={`flex flex-wrap items-end gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t("dateFrom")}</label>
        <DatePicker
          value={toNativeDate(from)}
          onChange={(v) => onFromChange(toISODate(v))}
          calendar={calendar}
          locale={locale}
          maxDate={toNativeDate(to) || undefined}
          inputClass={inputClasses}
          className={theme === "dark" ? "bg-dark" : undefined}
          calendarPosition={isRTL ? "bottom-right" : "bottom-left"}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t("dateTo")}</label>
        <DatePicker
          value={toNativeDate(to)}
          onChange={(v) => onToChange(toISODate(v))}
          calendar={calendar}
          locale={locale}
          minDate={toNativeDate(from) || undefined}
          inputClass={inputClasses}
          className={theme === "dark" ? "bg-dark" : undefined}
          calendarPosition={isRTL ? "bottom-right" : "bottom-left"}
        />
      </div>
      {(from || to) && (
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          {t("clearFilter")}
        </button>
      )}
    </div>
  );
}
