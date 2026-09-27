"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export default function SelectField({ value, onChange, options, placeholder = "انتخاب کنید" }: Props) {
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" dir={isRTL ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm outline-none transition-all cursor-pointer
          bg-white dark:bg-gray-800
          ${open
            ? "border-brand-400 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-500/20"
            : "border-gray-200 dark:border-gray-700"
          }
          ${value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${isRTL ? "mr-2" : "ml-2"} ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-black/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">موردی یافت نشد</div>
            )}
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors
                  ${opt === value
                    ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                {opt === value
                  ? <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  : <span className="h-3.5 w-3.5 shrink-0" />
                }
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
