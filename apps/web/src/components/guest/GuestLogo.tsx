import Link from "next/link";
import { Calendar } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

export default function GuestLogo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 text-lg font-black text-g-ink ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--g-gradient)] text-[#1a0f14] shadow-[0_8px_24px_-8px_rgb(242_135_106/0.8)] transition group-hover:scale-105">
        <Calendar className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
      </span>
      {SITE_NAME}
    </Link>
  );
}
