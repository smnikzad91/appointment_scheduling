"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

// Back from a salon page (over the cover, opposite the favourite heart): to the page the visitor
// came from on this site (landing showcase, /salons, the customer panel…), else to /salons — a
// shared link or QR opened in a new tab has nothing to go back to.
export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  function back() {
    const sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (sameSite && window.history.length > 1) router.back();
    else router.push("/salons");
  }

  return (
    <button
      type="button"
      onClick={back}
      aria-label="بازگشت"
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur active:scale-95 ${className}`}
    >
      {/* RTL: «back» points right */}
      <ArrowRight className="h-5 w-5 text-[#2a1d26]" aria-hidden />
    </button>
  );
}
