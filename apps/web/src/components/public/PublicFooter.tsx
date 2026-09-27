"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SocialIcon, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import type { SocialPlatform } from "@/types/content";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";

interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string;
}

const links = {
  product: [
    { label: "امکانات", href: "/#features" },
    { label: "قیمت‌گذاری", href: "/pricing" },
    { label: "وبلاگ", href: "/blog" },
    { label: "اخبار", href: "/news" },
  ],
  support: [
    { label: "شروع سریع", href: "/docs" },
    { label: "تماس با ما", href: "/contact" },
    { label: "سوالات متداول", href: "/faq" },
  ],
  legal: [
    { label: "حریم خصوصی", href: "/privacy" },
    { label: "شرایط استفاده", href: "/terms" },
  ],
};

export default function PublicFooter() {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);

  useEffect(() => {
    fetch("/api/public/social-links")
      .then((r) => r.json())
      .then((d) => setSocialLinks(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  return (
    <footer className="relative border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Top section */}
      <Reveal className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-base font-extrabold text-white shadow-theme-sm">
                ن
              </span>
              <span className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white">
                نوبتا
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              سامانه نوبت‌دهی آنلاین سالن‌های زیبایی — صفحه رزرو اختصاصی، پنل آرایشگر و مدیریت نوبت‌ها در یک جا.
            </p>

            {/* Dynamic social links */}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map((sl) => (
                  <a
                    key={sl.id}
                    href={sl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
                  >
                    <SocialIcon platform={sl.platform} className="h-4 w-4 shrink-0" />
                    <span>{(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">محصول</h3>
            <ul className="mt-5 space-y-3">
              {links.product.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">پشتیبانی</h3>
            <ul className="mt-5 space-y-3">
              {links.support.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / status */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-500">خبرنامه</h3>
            <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
              جدیدترین اخبار و به‌روزرسانی‌ها را دریافت کنید.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-newsletter-email" className="sr-only">ایمیل شما</label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="ایمیل شما"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
              <Button type="submit" size="sm" className="shrink-0">عضو شو</Button>
            </form>

            {/* Status indicator */}
            <div className="mt-5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              همه سیستم‌ها عملیاتی
            </div>
          </div>
        </div>
      </Reveal>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            © ۱۴۰۵ نوبتا — تمام حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-5">
            {links.legal.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-gray-300">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
