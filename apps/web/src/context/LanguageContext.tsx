"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "en" || saved === "fa") apply(saved);
    else apply("en");
  }, []);

  function apply(l: Lang) {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "fa" ? "rtl" : "ltr");
    document.body.style.fontFamily = l === "fa" ? "Vazirmatn, sans-serif" : "";
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang: apply }}>
      {children}
    </LanguageContext.Provider>
  );
};
