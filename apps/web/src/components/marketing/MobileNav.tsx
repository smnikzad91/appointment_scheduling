"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, Menu, X } from "lucide-react";
import InstallAppButton from "@/components/common/InstallAppButton";

/**
 * Phone menu for the landing/public header (the inline nav is md+ only): a glass panel under the
 * header with every nav link plus customer sign-up and app install, which don't fit the bar.
 */
export default function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  // Links close it themselves (incl. same-page #anchors); Escape too. Page scroll is locked while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "بستن منو" : "منو"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-g-line-strong bg-g-glass-soft text-g-ink transition active:scale-95"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>

      {/* Portalled: the header's backdrop-filter would otherwise trap position:fixed inside it.
          Re-applies guest-root so the g-* tokens resolve out there. */}
      {open &&
        createPortal(
        <div className="app-root guest-root" style={{ background: "transparent" }} dir="rtl">
          <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 bg-black/50 backdrop-blur-sm motion-safe:animate-[app-fade-in_0.2s_ease-out]" onClick={() => setOpen(false)} aria-hidden />
          <nav
            id="mobile-nav"
            aria-label="منوی اصلی"
            className="g-glass fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl p-2 motion-safe:animate-[g-rise_0.35s_cubic-bezier(0.2,0.75,0.2,1)]"
          >
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-bold text-g-ink transition active:bg-white/10"
                  >
                    {link.label}
                    <ChevronLeft className="h-4 w-4 text-g-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-col gap-2 border-t border-g-line p-2 pt-3">
              <Link href="/signup" onClick={() => setOpen(false)} className="g-btn g-btn-ghost h-12 text-sm">
                ثبت‌نام مشتری
              </Link>
              <InstallAppButton className="h-12 justify-center" />
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </div>
  );
}
