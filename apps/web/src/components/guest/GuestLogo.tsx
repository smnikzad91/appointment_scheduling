import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

/** Site logo for the guest pages (header, footer, auth): the round brand emblem + the name. */
export default function GuestLogo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 text-lg font-black text-g-ink ${className}`}>
      <Image
        src="/images/logo/logo_symbol_transparent.png"
        alt=""
        width={40}
        height={40}
        priority
        className="h-10 w-10 shrink-0 drop-shadow-[0_6px_18px_rgb(242_135_106/0.35)] transition group-hover:scale-105"
      />
      {SITE_NAME}
    </Link>
  );
}
