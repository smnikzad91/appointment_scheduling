import Link from "next/link";
import InstallAppButton from "@/components/common/InstallAppButton";
import GuestLogo from "@/components/guest/GuestLogo";
import MobileNav from "./MobileNav";

const NAV_LINKS = [
  { href: "/salons", label: "جستجوی سالن" },
  { href: "/#features", label: "امکانات" },
  { href: "/#apps", label: "اپلیکیشن‌ها" },
  { href: "/#pricing", label: "تعرفه‌ها" },
  { href: "/tutorials", label: "راهنما" },
  { href: "/#faq", label: "سؤالات متداول" },
];

export default function MarketingHeader() {
  return (
    <header className="app-pt-safe sticky top-0 z-40 border-b border-g-line bg-g-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <GuestLogo />

        <nav className="hidden items-center gap-1 text-sm font-medium text-g-muted md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full px-3 py-1.5 transition hover:bg-white/5 hover:text-g-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <InstallAppButton className="hidden sm:inline-flex" />
          <Link href="/signin" className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-g-muted transition hover:text-g-ink">
            ورود
          </Link>
          {/* Customer sign-up; salon owners use the gradient button next to it. */}
          <Link href="/signup" className="g-btn g-btn-ghost hidden h-10 px-4 text-sm sm:inline-flex">
            ثبت‌نام
          </Link>
          <Link href="/signup-salon" className="g-btn g-btn-primary h-10 px-4 text-sm">
            ثبت‌نام سالن
          </Link>
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
