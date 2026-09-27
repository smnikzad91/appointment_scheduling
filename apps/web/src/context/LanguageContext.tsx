"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

type Lang = "en" | "fa";

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

/**
 * Only the platform-admin panel is bilingual. Every other page — public salon pages, sign-in,
 * the customer, salon and stylist panels — is always Persian/RTL, whatever the admin's stored
 * preference is. Keep in sync with public/theme-init.js, which applies the same rule before
 * hydration.
 */
export function isBilingualPath(pathname: string | null) {
  return !!pathname && (pathname === "/admin" || pathname.startsWith("/admin/"));
}

// The stored preference is an external store: read with useSyncExternalStore so the server render
// ("en") and the first client render agree, then it picks up localStorage.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readSaved(): Lang {
  try {
    return localStorage.getItem("lang") === "fa" ? "fa" : "en";
  } catch {
    return "en";
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const bilingual = isBilingualPath(pathname);
  const saved = useSyncExternalStore(subscribe, readSaved, () => "en" as Lang);
  const lang: Lang = bilingual ? saved : "fa";

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
    document.body.style.fontFamily = lang === "fa" ? "Vazirmatn, sans-serif" : "";
  }, [lang]);

  function setLang(l: Lang) {
    try {
      localStorage.setItem("lang", l);
    } catch {
      // Storage blocked — nothing to persist; the page keeps its current language.
    }
    listeners.forEach((cb) => cb());
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
};
