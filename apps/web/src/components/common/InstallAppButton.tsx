"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/lib/installPrompt";
import IosInstallSheet from "./IosInstallSheet";

/**
 * "نصب اپ" for the landing page header — rendered while the browser allows installing, or on
 * iPhone Safari, where it opens the Add-to-Home-Screen instructions instead.
 */
export default function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, iosHint, install } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (!canInstall && !iosHint) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (canInstall ? void install() : setIosOpen(true))}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#2a1d26]/15 bg-white px-3 py-2 text-sm font-bold text-[#2a1d26] transition hover:border-[#a34a30] hover:text-[#a34a30] ${className}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        نصب اپ
      </button>
      {iosHint && <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />}
    </>
  );
}
