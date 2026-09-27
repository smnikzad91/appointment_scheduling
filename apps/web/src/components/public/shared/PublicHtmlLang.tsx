"use client";

import { useEffect } from "react";

/**
 * The public site is Persian-only, independent of the dashboard's EN/FA
 * language toggle (LanguageContext, which drives `<html lang>` elsewhere
 * and defaults to "en"). LanguageProvider's own mount effect fires after
 * this one and unconditionally resets lang/dir to "en"/"ltr", so a single
 * corrective effect loses the race — a MutationObserver keeps re-asserting
 * the correct values for as long as a public page is mounted.
 */
export function PublicHtmlLang() {
  useEffect(() => {
    const html = document.documentElement;
    const enforce = () => {
      if (html.getAttribute("lang") !== "fa") html.setAttribute("lang", "fa");
      if (html.getAttribute("dir") !== "rtl") html.setAttribute("dir", "rtl");
    };

    enforce();
    const observer = new MutationObserver(enforce);
    observer.observe(html, { attributes: true, attributeFilter: ["lang", "dir"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
