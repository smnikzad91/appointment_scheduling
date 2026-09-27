"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Check, LoaderCircle } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { joinWaitlist } from "@/lib/api/discovery";
import { persianApiError } from "@/lib/api/errorMessages";

/**
 * Shown under a fully booked day: join the salon's waitlist for it and get a notification if an
 * appointment that day is cancelled. Needs a customer account — signed-out visitors sign in and
 * come back to this same day.
 */
export default function WaitlistButton({ slug, dateKey, serviceIds, stylistId }: { slug: string; dateKey: string; serviceIds: string[]; stylistId: string | null }) {
  const token = useApiAccessToken();
  const [state, setState] = useState<"idle" | "busy" | "joined">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    const back = `/s/${slug}?book=1&services=${serviceIds.join(",")}${stylistId ? `&stylist=${stylistId}` : ""}&date=${dateKey}`;
    return (
      <Link
        href={`/signin?callbackUrl=${encodeURIComponent(back)}`}
        className="mt-3 flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-bold"
        style={{ borderColor: "var(--salon-brand)", color: "var(--salon-brand)" }}
      >
        <BellRing className="h-4 w-4" aria-hidden />
        وارد شوید تا اگر وقتی خالی شد خبرتان کنیم
      </Link>
    );
  }

  if (state === "joined") {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <Check className="h-4 w-4" aria-hidden />
        اگر وقتی در این روز خالی شد، خبرتان می‌کنیم
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          setError(null);
          try {
            await joinWaitlist(token, slug, { date: dateKey, serviceIds, ...(stylistId && { stylistId }) });
            setState("joined");
          } catch (err) {
            setState("idle");
            setError(persianApiError(err, "ثبت در لیست انتظار انجام نشد"));
          }
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--salon-brand)" }}
      >
        {state === "busy" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
        اگر وقتی خالی شد خبرم کن
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </>
  );
}
