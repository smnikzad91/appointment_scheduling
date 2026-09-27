"use client";

import { Download } from "lucide-react";
import { useInstallPrompt } from "@/lib/installPrompt";

/** "نصب اپ" for the landing page header — only rendered while the browser allows installing. */
export default function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#2a1d26]/15 bg-white px-3 py-2 text-sm font-bold text-[#2a1d26] transition hover:border-[#a34a30] hover:text-[#a34a30] ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden />
      نصب اپ
    </button>
  );
}
