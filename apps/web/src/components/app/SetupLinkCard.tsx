"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/app/ui";
import { setupLinkUrl } from "@/lib/api/passwordSetup";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";

/**
 * A stylist's one-time "set your password" link, as the owner sees it right after creating or
 * regenerating it. «ارسال» opens the phone's share sheet (Telegram, WhatsApp, SMS…); where there
 * is none (desktop, plain-http dev) it copies instead, and the link stays visible to copy by hand.
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
