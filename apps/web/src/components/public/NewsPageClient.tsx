"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { newsTagConfig, stripHash, formatDateFa } from "@/components/public/shared/contentTaxonomy";

export interface NewsItem {
  id: string;
  category: string;
  hashtags?: string[];
  title: string;
  body: string;
  image?: string;
  highlight: boolean;
  publishedAt?: string;
}

interface Props {
  news: NewsItem[];
}

export default function NewsPageClient({ news }: Props) {
  const [activeTag, setActiveTag] = useState("همه");

  const allTags = ["همه", ...Array.from(new Set(news.map((n) => stripHash(n.category))))];
  const filtered = (activeTag === "همه" ? news : news.filter((n) => stripHash(n.category) === activeTag))
    .slice()
    .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0));
  const [featured, ...rest] = filtered;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[380px] w-[380px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-150px)] -top-10 h-[300px] w-[300px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">

        {/* ─── Header ─── */}
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            آخرین به‌روزرسانی‌ها
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            اخبار و اعلانات
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-500 dark:text-gray-400">
            قابلیت‌های جدید، به‌روزرسانی‌های سرویس و اطلاعیه‌های مهم.
          </p>
          <div className="mt-5">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              مطالب آموزشی را در وبلاگ بخوانید
            </Link>
          </div>
        </Reveal>

        {/* ─── Filter tabs ─── */}
        <Reveal delay={0.1} className="mt-8 flex flex-wrap justify-center gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeTag === tag
                  ? "bg-gradient-to-r from-brand-500 to-theme-purple-500 text-white shadow-md shadow-brand-500/25"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              }`}
            >
              {tag}
            </button>
          ))}
        </Reveal>

        {/* ─── Content ─── */}
        <section className="mt-12">

          {filtered.length === 0 && (
            <div className="py-24 text-center text-gray-400 dark:text-gray-500">
              خبری در این دسته یافت نشد.
            </div>
          )}

          {featured && (() => {
            const FeaturedIcon = newsTagConfig[featured.category]?.icon ?? Newspaper;
            return (
            <Reveal className="mb-6">
              <Link
                href={`/news/${featured.id}`}
                className="group relative block overflow-hidden rounded-3xl shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5"
              >
                {/* Banner */}
                <div className={`relative overflow-hidden ${featured.image ? "h-56 sm:h-64 bg-gray-900" : `h-44 sm:h-52 bg-gradient-to-br ${newsTagConfig[featured.category]?.gradient ?? "from-brand-500 to-indigo-600"}`}`}>
                  {featured.image
                    ? <>
                        <Image src={featured.image} alt={featured.title} fill sizes="(max-width: 1024px) 100vw, 1152px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/35" />
                      </>
                    : <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  }
                  {/* Icon */}
                  <div className="absolute bottom-0 right-8 flex h-20 w-20 translate-y-1/2 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white shadow-theme-lg dark:border-gray-900">
                    <FeaturedIcon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  {/* New badge */}
                  {featured.highlight && (
                    <div className="absolute left-6 top-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                        تازه‌ترین
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="border border-gray-200/80 border-t-0 rounded-b-3xl bg-white px-8 pb-8 pt-14 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${newsTagConfig[featured.category]?.badge}`}>
                      {stripHash(featured.category)}
                    </span>
                    {featured.publishedAt && (
                      <span className="rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{formatDateFa(featured.publishedAt)}</span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-500 dark:text-gray-400">
                    {featured.body}
                  </p>
                  {featured.hashtags && featured.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {featured.hashtags.map((tag) => (
                        <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                          #{stripHash(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-all group-hover:gap-2.5 dark:text-brand-400">
                    بیشتر بخوانید
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </div>
                </div>
              </Link>
            </Reveal>
            );
          })()}

          {/* ── Grid cards ── */}
          {rest.length > 0 && (
            <Stagger className="grid gap-5 sm:grid-cols-2">
              {rest.map((item) => {
                const cfg = newsTagConfig[item.category];
                const Icon = cfg?.icon ?? Newspaper;
                return (
                  <StaggerItem key={item.id}>
                    <Link
                      href={`/news/${item.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:border-gray-800 dark:bg-gray-900"
                    >
                      {/* Image or color strip */}
                      {item.image
                        ? <div className="relative h-36 overflow-hidden">
                            <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/20" />
                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg?.gradient ?? "from-gray-300 to-gray-400"}`} />
                          </div>
                        : <div className={`h-1.5 w-full bg-gradient-to-r ${cfg?.gradient ?? "from-gray-300 to-gray-400"}`} />
                      }

                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${cfg?.gradient ?? "from-gray-400 to-gray-500"}`}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          {item.publishedAt && (
                            <span className="rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{formatDateFa(item.publishedAt)}</span>
                          )}
                        </div>

                        <h2 className="mt-4 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                          {item.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                          {item.body}
                        </p>

                        {item.hashtags && item.hashtags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.hashtags.map((tag) => (
                              <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                                #{stripHash(tag)}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.highlight && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                            تازه‌ترین
                          </div>
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>
      </div>
    </div>
  );
}
