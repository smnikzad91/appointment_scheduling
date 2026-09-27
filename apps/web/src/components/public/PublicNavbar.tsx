"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Menu, X } from "lucide-react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import MarkIcon from "@/brand/mark.svg";
import MarkWhiteIcon from "@/brand/mark-white.svg";
import { SocialIcon, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import type { SocialPlatform } from "@/types/content";
import { Button } from "@/components/public/shared/Button";
import { easeSignal, staggerContainer, staggerItem } from "@/components/public/shared/motion";

interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string;
}

interface AnnouncementItem {
  _id: string;
  text: string;
  link?: string;
  linkText?: string;
  emoji?: string;
}

const navLinks = [
  { label: "امکانات", href: "/#features" },
  { label: "قیمت‌گذاری", href: "/pricing" },
  { label: "وبلاگ", href: "/blog" },
  { label: "اخبار", href: "/news" },
];

export default function PublicNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [announced, setAnnounced]       = useState(true);
  const [socialLinks, setSocialLinks]   = useState<SocialLinkItem[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    fetch("/api/public/social-links")
      .then((r) => r.json())
      .then((d) => setSocialLinks(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/public/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncement(d ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── Sticky navbar ── */}
      <div className="sticky top-0 z-50" dir="rtl">

        {/* Announcement bar */}
        <AnimatePresence initial={false}>
          {announced && announcement && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: easeSignal }}
              className="relative overflow-hidden bg-gray-900 dark:bg-brand-950"
            >
              <div className="flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold text-white">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
                </span>
                <span className="text-center leading-snug">
                  {announcement.emoji && `${announcement.emoji} `}
                  {announcement.text}
                  {announcement.link && (
                    <span className="whitespace-nowrap">
                      {" — "}
                      <Link href={announcement.link} className="underline underline-offset-2 opacity-90 hover:opacity-100">
                        {announcement.linkText || "بیشتر بدانید"}
                      </Link>
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setAnnounced(false)}
                  className="absolute left-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main navbar */}
        <header
          className={`transition-all duration-300 ${
            scrolled
              ? "border-b border-gray-200 bg-white/85 shadow-theme-sm backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80"
              : "border-b border-gray-200/70 bg-white dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={36} height={36} />
              <MarkWhiteIcon viewBox="6 12 36 36" className="shrink-0 hidden dark:block" width={36} height={36} />
              <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                mqttcloud<span className="font-normal text-brand-600 dark:text-brand-400">.ir</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 md:flex">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop right side */}
            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggleButton />
              {socialLinks.length > 0 && (
                <>
                  <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
                  {socialLinks.map((sl) => (
                    <a
                      key={sl.id}
                      href={sl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      <SocialIcon platform={sl.platform} className="h-4 w-4" />
                    </a>
                  ))}
                </>
              )}
              <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
              <Link
                href="/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                ورود
              </Link>
              <Button href="/signup" size="sm">شروع رایگان</Button>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggleButton />
              <button
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              key="drawer"
              dir="rtl"
              className="fixed top-0 right-0 bottom-0 z-[60] flex w-[85vw] max-w-sm flex-col overflow-hidden bg-white shadow-theme-xl dark:bg-gray-900 md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: easeSignal }}
            >
              {/* Brand accent strip */}
              <div className="h-1 w-full shrink-0 bg-brand-500" />

              {/* Menu header */}
              <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800 sm:px-6">
                <Link href="/" className="flex items-center gap-2.5">
                  <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={36} height={36} />
                  <MarkWhiteIcon viewBox="6 12 36 36" className="shrink-0 hidden dark:block" width={36} height={36} />
                  <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
                    mqttcloud<span className="font-normal text-brand-600 dark:text-brand-400">.ir</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="group flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-theme-xs transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="بستن منو"
                >
                  <X className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
                </button>
              </div>

              {/* Scrollable body */}
              <motion.div
                className="relative flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-5 sm:px-6"
                variants={staggerContainer(0.06, 0.05)}
                initial="hidden"
                animate="show"
              >
                {/* Nav links */}
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <motion.div key={link.href} variants={staggerItem}>
                        <Link
                          href={link.href}
                          className={`group flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                            active
                              ? "bg-gradient-to-r from-brand-500 to-theme-purple-500 text-white shadow-theme-sm"
                              : "text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                          }`}
                        >
                          {link.label}
                          <ChevronLeft
                            className={`h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 ${active ? "text-white/70" : "text-gray-400 dark:text-gray-600"}`}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Social links */}
                {socialLinks.length > 0 && (
                  <motion.div className="mt-6" variants={staggerItem}>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700/60 dark:bg-gray-800/50">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">
                        ما را دنبال کنید
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {socialLinks.map((sl) => (
                          <a
                            key={sl.id}
                            href={sl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
                          >
                            <SocialIcon platform={sl.platform} className="h-4 w-4 shrink-0" />
                            <span>{(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Spacer pushes auth to bottom */}
                <div className="flex-1" />

                {/* Auth buttons */}
                <motion.div className="mt-6 flex flex-col gap-3" variants={staggerItem}>
                  <Link
                    href="/signin"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-center text-sm font-semibold text-gray-600 shadow-theme-xs transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    ورود
                  </Link>
                  <Button href="/signup" size="lg" className="w-full">شروع رایگان</Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
