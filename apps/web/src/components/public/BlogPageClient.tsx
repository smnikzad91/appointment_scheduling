"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FileText } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { blogCategoryConfig, stripHash, formatDateFa } from "@/components/public/shared/contentTaxonomy";

export interface BlogPostSummary {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  hashtags?: string[];
  createdAt?: string;
  coverImage?: string;
  highlight?: boolean;
}

interface Props {
  posts: BlogPostSummary[];
}

export default function BlogPageClient({ posts }: Props) {
  const [activeCategory, setActiveCategory] = useState("همه");

  const allCategories = ["همه", ...Array.from(new Set(posts.map((p) => stripHash(p.category))))];
  const filtered = (activeCategory === "همه" ? posts : posts.filter((p) => stripHash(p.category) === activeCategory))
    .slice()
    .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0));
  const [featured, ...rest] = filtered;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[380px] w-[380px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-150px)] -top-10 h-[300px] w-[300px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">

        {/* ─── Header ─── */}
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            آموزش و راهنما
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            وبلاگ
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-500 dark:text-gray-400">
            آموزش راه‌اندازی بروکر MQTT، اتصال دستگاه‌ها و راهنمای استفاده از mqttcloud.ir.
          </p>
          <div className="mt-5">
            <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              آخرین اخبار و اعلانات را ببینید
            </Link>
          </div>
        </Reveal>

        {/* ─── Category filters ─── */}
        <Reveal delay={0.1} className="mt-8 flex flex-wrap justify-center gap-2">
          {allCategories.map((cat) => {
            const cfg = cat !== "همه" ? blogCategoryConfig[cat] : null;
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-brand-500 to-theme-purple-500 text-white shadow-md shadow-brand-500/25"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                }`}
              >
                {cfg && <cfg.icon className="h-4 w-4" aria-hidden="true" />}
                {cat}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {cat === "همه" ? posts.length : posts.filter((p) => stripHash(p.category) === cat).length}
                </span>
              </button>
            );
          })}
        </Reveal>

        {/* ─── Content ─── */}
        <section className="mt-12">

          {filtered.length === 0 && (
            <div className="py-24 text-center text-gray-400 dark:text-gray-500">مقاله‌ای در این دسته یافت نشد.</div>
          )}

          {/* Featured post */}
          {featured && (() => {
            const cfg = blogCategoryConfig[featured.category];
            const Icon = cfg?.icon ?? FileText;
            return (
              <Reveal className="mb-6">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group block overflow-hidden rounded-3xl shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5"
                >
                  {/* Banner */}
                  <div className={`relative h-48 sm:h-60 ${!featured.coverImage ? `bg-gradient-to-br ${cfg?.gradient ?? "from-brand-500 to-indigo-600"}` : "bg-gray-900"} overflow-hidden`}>
                    {featured.coverImage
                      ? <Image src={featured.coverImage} alt={featured.title} fill sizes="(max-width: 1024px) 100vw, 1152px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      : <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                    }
                    {featured.coverImage && <div className="absolute inset-0 bg-black/30" />}

                    {/* Category icon */}
                    <div className="absolute bottom-0 right-8 flex h-20 w-20 translate-y-1/2 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white shadow-theme-lg dark:border-gray-900">
                      <Icon className="h-8 w-8" aria-hidden="true" />
                    </div>

                    {/* Highlight badge */}
                    {featured.highlight && (
                      <div className="absolute right-6 top-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                          پست ویژه
                        </span>
                      </div>
                    )}

                    {/* Read time + date badges */}
                    <div className="absolute left-6 top-6 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {featured.readTime} مطالعه
                      </div>
                      {featured.createdAt && (
                        <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateFa(featured.createdAt, "short")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="border border-gray-200/80 border-t-0 rounded-b-3xl bg-white px-8 pb-8 pt-14 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold ${cfg?.badge}`}>{stripHash(featured.category)}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                      {featured.excerpt}
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

          {/* Grid */}
          {rest.length > 0 && (
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => {
                const cfg = blogCategoryConfig[post.category];
                const Icon = cfg?.icon ?? FileText;
                return (
                  <StaggerItem key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:border-gray-800 dark:bg-gray-900"
                    >
                      {/* Banner */}
                      {post.coverImage
                        ? <div className="relative h-36 overflow-hidden">
                            <Image src={post.coverImage} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/20" />
                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg?.gradient ?? "from-gray-300 to-gray-400"}`} />
                          </div>
                        : <div className={`h-1.5 w-full bg-gradient-to-r ${cfg?.gradient ?? "from-gray-300 to-gray-400"}`} />
                      }

                      <div className="flex flex-1 flex-col p-5">
                        {/* Icon + category + date */}
                        <div className="flex items-center justify-between">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg?.light}`}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${cfg?.badge}`}>
                            {stripHash(post.category)}
                          </span>
                        </div>

                        {/* Title + excerpt */}
                        <h2 className="mt-4 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                          {post.title}
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500 line-clamp-3 dark:text-gray-400">
                          {post.excerpt}
                        </p>
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {post.hashtags.map((tag) => (
                              <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                                #{stripHash(tag)}
                              </span>
                            ))}
                          </div>
                        )}

                        {post.highlight && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                            پست ویژه
                          </div>
                        )}

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {post.readTime}
                            </span>
                            {post.createdAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDateFa(post.createdAt, "short")}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-brand-500 opacity-0 transition-all duration-200 group-hover:opacity-100 dark:text-brand-400">
                            بخوانید
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                          </span>
                        </div>
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
