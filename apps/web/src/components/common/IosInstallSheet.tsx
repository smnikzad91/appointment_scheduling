"use client";

import { Share, SquarePlus } from "lucide-react";
import Sheet from "@/components/app/Sheet";
import { SITE_NAME } from "@/lib/site";
import { toPersianDigits } from "@/lib/persian";

// iPhone/iPad Safari has no install prompt: the app is added from the Share menu by hand. The
// iOS menu labels are quoted in English (as most Iranian iPhones show them) with the Persian
// meaning beside them.

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent text-sm font-black text-app-accent-ink">
        {toPersianDigits(n)}
      </span>
      <span className="pt-0.5 text-[15px] leading-7 text-app-ink">{children}</span>
    </li>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="mx-0.5 inline-flex items-center gap-1 rounded-lg bg-app-card-2 px-2 py-0.5 text-[13px] font-bold text-app-ink">
      {children}
    </span>
  );
}

export default function IosInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={`نصب ${SITE_NAME} روی آیفون`}>
      <p className="mb-4 text-sm leading-6 text-app-muted">
        در Safari آیفون دکمه نصب مستقیم وجود ندارد؛ با این سه قدم {SITE_NAME} مثل یک اپ روی صفحه اصلی گوشی می‌نشیند.
      </p>
      <ol className="flex flex-col gap-4">
        <Step n={1}>
          در نوار پایین Safari روی دکمه اشتراک‌گذاری{" "}
          <Key>
            <Share className="h-4 w-4 text-[#0a84ff]" aria-label="Share" />
          </Key>{" "}
          بزنید.
        </Step>
        <Step n={2}>
          کمی پایین بروید و{" "}
          <Key>
            <SquarePlus className="h-4 w-4" aria-hidden />
            Add to Home Screen
          </Key>{" "}
          («افزودن به صفحه اصلی») را انتخاب کنید.
        </Step>
        <Step n={3}>
          بالای صفحه روی <Key>Add</Key> بزنید. آیکون {SITE_NAME} روی صفحه اصلی گوشی اضافه می‌شود.
        </Step>
      </ol>
      <p className="mt-5 rounded-2xl bg-app-card-2 p-3 text-xs leading-6 text-app-muted">
        اگر این صفحه را داخل اینستاگرام یا تلگرام باز کرده‌اید، اول آن را در Safari باز کنید.
      </p>
    </Sheet>
  );
}
