"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SocialIcon, PLATFORM_LABELS_FA } from "@/components/common/SocialIcon";
import { HeroPreview } from "@/components/public/home/HeroPreview";
import { HeroFloatingIcons } from "@/components/public/home/HeroFloatingIcons";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { CountUp } from "@/components/public/shared/CountUp";
import type { FeaturedBlog, FeaturedNews, SocialLinkItem } from "./types";

const stats = [
  { value: "۵۰ms", label: "میانگین تأخیر پیام", animate: true },
  { value: "۹۹.۹٪", label: "پایداری بروکر", animate: true },
  { value: "۲۴/۷", label: "بروکر همیشه فعال", animate: false },
];

/**
 * The hero's motion is purely decorative marketing flourish, so it
 * intentionally ignores prefers-reduced-motion (via forceMotion props +
 * the .force-motion-* classes in globals.css) rather than going still.
 * Every other animated section on the site still respects that preference.
 */
export default function Hero({
  featuredBlog,
  featuredNews,
  socialLinks,
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
  socialLinks: SocialLinkItem[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-brand-50/50 via-white to-white px-4 py-20 dark:from-brand-950/25 dark:via-gray-900 dark:to-gray-900 sm:px-6 lg:px-8">
      {/* Dot-grid texture for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />

      {/* Animated gradient mesh — drifts on its own and parallax-shifts as the page scrolls */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ y: blobY }}>
        <AmbientGlow forceMotion className="-left-24 -top-24 h-[440px] w-[440px] bg-brand-500/20 blur-[110px] dark:bg-brand-500/20" duration={19} />
        <AmbientGlow forceMotion className="-bottom-32 -right-16 h-[400px] w-[400px] bg-theme-purple-500/15 blur-[120px] dark:bg-theme-purple-500/15" duration={24} />
        <AmbientGlow forceMotion className="left-[calc(50%-160px)] top-1/3 h-[320px] w-[320px] bg-theme-pink-500/10 blur-[130px] dark:bg-theme-pink-500/10" duration={28} />
      </motion.div>

      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">

        {/* ── Text pane ── */}
        <div>
          {/* Badge */}
          <Reveal forceMotion className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
              <span className="relative flex h-2 w-2">
                <span className="force-motion-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-br from-brand-500 to-theme-purple-500" />
              </span>
              بروکر MQTT ابری
            </span>
            {featuredBlog && (
              <Link href={`/blog/${featuredBlog.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-success-600 transition-colors hover:bg-success-100 dark:border-success-800/40 dark:bg-success-500/10 dark:text-success-400"
              >
                پست ویژه: {featuredBlog.title}
              </Link>
            )}
            {!featuredBlog && featuredNews && (
              <Link href={`/news/${featuredNews.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-success-600 transition-colors hover:bg-success-100 dark:border-success-800/40 dark:bg-success-500/10 dark:text-success-400"
              >
                تازه‌ترین: {featuredNews.title}
              </Link>
            )}
          </Reveal>

          {/* Headline */}
          <Reveal forceMotion delay={0.08}>
            <h1 className="mt-7 text-5xl font-extrabold leading-[1.2] tracking-tight text-gray-900 dark:text-white sm:text-6xl" style={{ textWrap: "balance" }}>
              بروکر MQTT خود را
              <br />
              <span className="force-motion-gradient-text animate-[gradient-text_6s_ease_infinite] bg-gradient-to-l from-brand-600 via-theme-purple-500 to-brand-600 bg-[length:200%_auto] bg-clip-text text-transparent dark:from-brand-400 dark:via-theme-purple-500 dark:to-brand-400">
                در چند ثانیه راه‌اندازی کنید
              </span>
            </h1>
          </Reveal>

          {/* Subtext */}
          <Reveal forceMotion delay={0.14}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              mqttcloud.ir یک اکانت و دستگاه بسازید، با TLS به بروکر متصل شوید و پیام‌های خود را
              بدون نیاز به راه‌اندازی زیرساخت، بی‌درنگ بین دستگاه‌ها منتشر و دریافت کنید.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal forceMotion delay={0.2}>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
              <Button href="/signup" size="lg" endIcon={<ArrowLeft className="h-4 w-4" />}>
                رایگان شروع کنید
              </Button>
              <Button href="/pricing" variant="secondary" size="lg">
                مشاهده تعرفه‌ها
              </Button>
            </div>
          </Reveal>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <Reveal forceMotion delay={0.26}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-500">ما را دنبال کنید:</span>
                {socialLinks.map((sl) => (
                  <a
                    key={sl.id}
                    href={sl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-theme-xs transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:border-brand-500/30"
                  >
                    <SocialIcon platform={sl.platform} className="h-4 w-4 shrink-0" />
                    <span>{(sl.label || PLATFORM_LABELS_FA[sl.platform]).replace(/^#/, "")}</span>
                  </a>
                ))}
              </div>
            </Reveal>
          )}

          {/* Stats strip */}
          <Reveal forceMotion delay={0.32}>
            <div className="mt-10 flex max-w-sm items-center gap-6 border-t border-gray-200 pt-8 dark:border-gray-800 sm:max-w-none sm:gap-10">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-start">
                  {stat.animate ? (
                    <CountUp forceMotion value={stat.value} className="text-2xl font-extrabold text-gray-900 dark:text-white" />
                  ) : (
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</span>
                  )}
                  <span className="mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── Notification feed preview ── */}
        <div className="relative">
          <HeroFloatingIcons forceMotion />
          <HeroPreview forceMotion />
        </div>
      </div>
    </section>
  );
}
