"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";

const languages = [
  { code: "en" as const, label: "English", native: "English", flag: "🇬🇧" },
  { code: "fa" as const, label: "Persian", native: "فارسی", flag: "🇮🇷" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const current = languages.find((l) => l.code === lang) ?? languages[0];

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((o) => !o);
  }

  function select(code: "en" | "fa") {
    setLang(code);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="dropdown-toggle flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Switch language"
      >
        <span className={`text-base leading-none ${lang === "fa" ? "scale-x-[-1] inline-block" : ""}`}>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${lang === "fa" ? "scale-x-[-1]" : ""}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        dir={lang === "fa" ? "rtl" : "ltr"}
        align={lang === "fa" ? "left" : "right"}
        className="w-40 p-1"
      >
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => select(l.code)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              lang === l.code
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <span className={`text-base ${lang === "fa" ? "scale-x-[-1] inline-block" : ""}`}>{l.flag}</span>
            <span className="flex-1 text-start">{l.native}</span>
            {lang === l.code && (
              <svg className={`h-4 w-4 shrink-0 ${lang === "fa" ? "scale-x-[-1]" : ""}`} viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}
