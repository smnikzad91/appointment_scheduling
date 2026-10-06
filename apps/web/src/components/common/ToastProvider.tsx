"use client";

import { Toaster } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

export default function ToastProvider() {
  const { lang } = useLanguage();
  return (
    <Toaster
      richColors
      theme="dark"
      // top-center everywhere: on a phone the bottom is the tab bar or a sheet's buttons
      position="top-center"
      duration={4000}
      dir={lang === "fa" ? "rtl" : "ltr"}
      // below the status bar of the installed app (black-translucent status bar)
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", bottom: "calc(env(safe-area-inset-bottom) + 12px)", left: 16, right: 16 }}
      toastOptions={{ style: { fontFamily: "Vazirmatn, Tahoma, sans-serif", fontSize: 14, lineHeight: 1.7 } }}
    />
  );
}
