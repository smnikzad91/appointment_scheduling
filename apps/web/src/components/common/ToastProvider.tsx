"use client";

import { Toaster } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

export default function ToastProvider() {
  const { lang } = useLanguage();
  return (
    <Toaster
      richColors
      theme="dark"
      position={lang === "fa" ? "bottom-left" : "bottom-right"}
    />
  );
}
