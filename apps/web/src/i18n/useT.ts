"use client";

import { useLanguage } from "@/context/LanguageContext";
import translations, { TranslationKey } from "./translations";

export function useT() {
  const { lang } = useLanguage();
  const dict = translations[lang] ?? translations.en;
  return function t(key: TranslationKey) {
    return dict[key] ?? translations.en[key];
  };
}
