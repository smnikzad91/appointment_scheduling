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
        className={`g-btn g-btn-ghost h-10 gap-1.5 px-3 text-sm ${className}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        نصب اپ
      </button>
      {iosHint && <IosInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />}
    </>
  );
}
