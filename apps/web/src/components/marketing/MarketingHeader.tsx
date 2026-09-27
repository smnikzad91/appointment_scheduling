import Link from "next/link";
import { Calendar } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "امکانات" },
  { href: "#apps", label: "اپلیکیشن‌ها" },
  { href: "#pricing", label: "تعرفه‌ها" },
  { href: "#faq", label: "سؤالات متداول" },
];

export default function MarketingHeader() {
  return (
    <header className="border-b border-black/5 bg-[#f7f0e8]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#2a1d26]">
          نوبتا
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a34a30] text-white">
            <Calendar className="h-4 w-4" aria-hidden />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#2a1d26] md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-[#a34a30]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/signin" className="hidden text-sm font-medium text-[#2a1d26] hover:text-[#a34a30] sm:inline">
            ورود
          </Link>
          <Link
            href="/signup-salon"
            className="rounded-lg bg-[#2a1d26] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#402c39]"
          >
            ثبت‌نام سالن
          </Link>
        </div>
      </div>
    </header>
  );
}
