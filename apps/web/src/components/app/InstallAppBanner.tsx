"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/installPrompt";
import { SITE_NAME } from "@/lib/site";

const SNOOZE_KEY = "install-banner-snoozed-until";
const SNOOZE_DAYS = 14;

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/**
 * Install card for the salon, stylist and customer panels, floating above the tab bar. Appears
 * only when the browser offers installation (and the app isn't installed); "بعداً" hides it for
 * two weeks.
 */
export default function InstallAppBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && snoozed());
  const [busy, setBusy] = useState(false);

  if (!canInstall || hidden) return null;

  function later() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      // Storage blocked — just hide it for this visit.
    }
    setHidden(true);
  }

  async function onInstall() {
    setBusy(true);
    const outcome = await install();
    setBusy(false);
    if (outcome === "dismissed") later(); // said no in the browser dialog: don't ask again soon
  }

  return (
    <>
      {/* Room below the page content so the floating card never hides the last item. */}
      <div aria-hidden className="h-40" />
    <div
      role="dialog"
      aria-label={`نصب ${SITE_NAME}`}
      className="app-rise fixed inset-x-3 bottom-[calc(74px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[calc(32rem-1.5rem)] rounded-3xl border border-app-line bg-app-card p-3.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-app-ink">{SITE_NAME} را روی گوشی نصب کنید</p>
          <p className="text-xs leading-5 text-app-muted">مثل یک اپ از صفحه اصلی گوشی باز می‌شود، بدون نوار مرورگر.</p>
        </div>
        <button type="button" onClick={later} aria-label="بعداً" className="self-start rounded-full p-1.5 text-app-muted active:bg-app-card-2">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onInstall}
          disabled={busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-app-accent text-[15px] font-bold text-app-accent-ink active:scale-[0.98] disabled:opacity-60"
        >
          <Download className="h-[18px] w-[18px]" aria-hidden />
          نصب اپلیکیشن
        </button>
        <button type="button" onClick={later} className="h-11 rounded-2xl px-4 text-sm font-bold text-app-muted active:bg-app-card-2">
          بعداً
        </button>
      </div>
    </div>
    </>
  );
}
