"use client";

import { useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations, { TranslationKey } from "./translations";

export function useT() {
  const { lang } = useLanguage();
  // Stable per language, so components can list `t` in hook dependencies without re-running every render.
  return useCallback(
    (key: TranslationKey) => (translations[lang] ?? translations.en)[key] ?? translations.en[key],
    [lang],
  );
}
