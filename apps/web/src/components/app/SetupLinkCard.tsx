"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, Share2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/app/ui";
import { setupLinkUrl } from "@/lib/api/passwordSetup";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";

/**
 * A stylist's one-time "set your password" link, as the owner sees it right after creating or
 * regenerating it. «ارسال» opens the phone's share sheet (Telegram, WhatsApp, SMS…); where there
 * is none (desktop, plain-http dev) it copies instead, and the link stays visible to copy by hand.
 * The QR code is for a stylist standing next to the owner: they scan it with their phone camera.
 * It's drawn locally (qrcode.react → SVG), so the link never goes to a third-party QR service.
 * Tapping it shows it full screen (easier to scan); the phone's back gesture closes that view
 * rather than leaving the page, because opening it pushes a history entry.
 */
export default function SetupLinkCard({
  token,
  expiresAt,
  stylistName,
  salonName,
}: {
  token: string;
  expiresAt: string;
  stylistName: string;
  salonName?: string | null;
}) {
  const url = setupLinkUrl(token);
  const [copied, setCopied] = useState(false);
  const [qrFull, setQrFull] = useState(false);

  // Back (gesture, button or Esc/tap below via history.back()) pops the entry pushed on open.
  useEffect(() => {
    if (!qrFull) return;
    const onPop = () => setQrFull(false);
    // Capture phase + stopPropagation: Esc closes only this view, not the bottom sheet behind it
    // (Sheet listens for Escape on document).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      history.back();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [qrFull]);

  function openQr() {
    history.pushState({ setupQr: true }, "");
    setQrFull(true);
  }
  const message =
    `سلام ${stylistName}،\n` +
    `برای ورود به پنل آرایشگر${salonName ? ` ${salonName}` : ""} در نوبتا، از این لینک رمز عبور خودتان را انتخاب کنید. ` +
    `لینک یک‌بار مصرف است و تا ${formatSalonDate(expiresAt)} اعتبار دارد.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${message}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. plain http) — the link is on screen to copy by hand.
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") return copy();
    try {
      // Must run straight from the tap — browsers only open the share sheet on a user gesture.
      await navigator.share({ title: "لینک ورود به پنل آرایشگر", text: message, url });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") await copy(); // AbortError = user closed the sheet
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <figure className="flex flex-col items-center gap-2 rounded-3xl border border-app-line bg-app-card p-4">
        {/* Always dark-on-white, even in dark mode — scanners need that contrast. */}
        <button type="button" onClick={openQr} aria-label="نمایش کد QR در اندازه کامل" className="rounded-2xl bg-white p-3 transition active:scale-95">
          <QRCodeSVG value={url} size={184} level="M" marginSize={0} title="کد QR لینک تعیین رمز" />
        </button>
        <figcaption className="text-center text-xs leading-6 text-app-muted">
          آرایشگر می‌تواند این کد را با دوربین گوشی خود اسکن کند. برای نمایش بزرگ‌تر، روی آن بزنید.
        </figcaption>
      </figure>

      {qrFull &&
        createPortal(
          // Above the bottom sheet (z-[100000]); white so it scans well in dark mode too.
          <div
            role="dialog"
            aria-modal="true"
            aria-label="کد QR لینک تعیین رمز"
            dir="rtl"
            // One history.back() per tap, and stop here: portal clicks still bubble through the
            // React tree, so they'd otherwise reach the bottom sheet this card sits in.
            onClick={(e) => {
              e.stopPropagation();
              history.back();
            }}
            className="app-pt-safe app-pb-safe fixed inset-0 z-[100001] flex flex-col items-center justify-center gap-6 bg-white px-6"
          >
            {/* No handler of its own: the tap bubbles to the overlay above, which goes back once. */}
            <button
              type="button"
              aria-label="بستن کد QR"
              className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-[#2a1d26]"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <QRCodeSVG value={url} size={512} level="M" marginSize={2} style={{ width: "min(88vw, 70vh)", height: "auto" }} />
            <p className="text-center text-sm leading-7 text-[#6b5a63]">
              کد را با دوربین گوشی {stylistName} اسکن کنید.
              <br />
              برای بستن، بازگشت بزنید.
            </p>
          </div>,
          document.body,
        )}
      <div className="rounded-3xl border border-dashed border-app-accent/50 bg-app-accent-soft p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-app-muted">
          <Link2 className="h-4 w-4 text-app-accent" aria-hidden />
          لینک یک‌بار مصرف تعیین رمز
        </p>
        <p dir="ltr" className="select-all break-all text-start font-mono text-[13px] leading-6 text-app-ink">
          {url}
        </p>
        <p className="mt-2 text-xs leading-6 text-app-muted">
          معتبر تا {formatSalonDate(expiresAt)}؛ بعد از یک بار استفاده یا ساختن لینک جدید، از کار می‌افتد.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? "کپی شد" : "کپی"}
        </Button>
        <Button icon={Share2} onClick={share}>
          ارسال
        </Button>
      </div>
      <p className="px-1 text-xs leading-6 text-app-muted">
        لینک را فقط برای خود آرایشگر بفرستید؛ هر کس آن را داشته باشد می‌تواند رمز این حساب را تعیین کند. رمز حداقل{" "}
        {toPersianDigits(8)} کاراکتر است.
      </p>
    </div>
  );
}
