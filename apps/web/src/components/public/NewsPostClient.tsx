"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ReadingProgress } from "@/components/public/shared/ReadingProgress";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { newsTagConfig, stripHash, formatDateFa } from "@/components/public/shared/contentTaxonomy";

export interface NewsItemDetail {
  id: string;
  category: string;
  hashtags?: string[];
  title: string;
  body: string;
  image?: string;
  coverImage?: string;
  highlight: boolean;
  publishedAt?: string;
}

export interface NewsItemSummary {
  id: string;
  category: string;
  title: string;
  image?: string;
  highlight: boolean;
  publishedAt?: string;
}

interface Props {
  item: NewsItemDetail;
  related: NewsItemSummary[];
}

export default function NewsPostClient({ item, related }: Props) {
  const cfg = newsTagConfig[item.category];
  const heroBanner = item.coverImage ?? item.image;

  return (
    <>
      <ReadingProgress />

      <div className="relative overflow-hidden">
        {/* Header banner */}
        {heroBanner
          ? <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden">
              <Image src={heroBanner} alt={item.title} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-white dark:to-gray-900" />
            </div>
          : <>
              <AmbientGlow className="left-[calc(50%-260px)] top-0 h-72 w-[520px] bg-brand-500/10 blur-3xl dark:bg-brand-500/15" duration={20} />
              <AmbientGlow className="left-[calc(50%+40px)] top-10 h-56 w-[420px] bg-theme-purple-500/8 blur-3xl dark:bg-theme-purple-500/10" duration={26} />
            </>
        }

        <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${heroBanner ? "-mt-16 pb-16" : "py-16"}`}>
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-14">

            {/* ── Main content ── */}
            <article>

              {/* Breadcrumb */}
              <Reveal as="nav" className="mb-8 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <Link href="/" className="transition-colors hover:text-brand-500">خانه</Link>
                <span>/</span>
                <Link href="/news" className="transition-colors hover:text-brand-500">اخبار</Link>
                <span>/</span>
                <span className="line-clamp-1 text-gray-600 dark:text-gray-300">{item.title}</span>
              </Reveal>

              {/* Header */}
              <Reveal as="header" delay={0.06} className="mb-10">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${cfg?.badge ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {cfg?.icon && <cfg.icon className="h-3 w-3" aria-hidden="true" />}
                    {stripHash(item.category)}
                  </span>
                  {item.highlight && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                      تازه‌ترین
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-extrabold leading-snug text-gray-900 dark:text-white sm:text-4xl">
                  {item.title}
                </h1>

                {item.publishedAt && (
                  <div className="mt-5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDateFa(item.publishedAt)}
                    </span>
                  </div>
                )}
              </Reveal>

              {/* Body */}
              <Reveal delay={0.1} className="text-gray-600 dark:text-gray-300 leading-8 whitespace-pre-line text-base">
                {item.body}
              </Reveal>

              {item.hashtags && item.hashtags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {item.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                      #{stripHash(tag)}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer bar */}
              <div className="mt-14 flex items-center justify-between border-t border-gray-100 pt-8 dark:border-gray-800">
                <Link
                  href="/news"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-brand-400 hover:text-brand-500 hover:-translate-x-0.5 dark:border-gray-700 dark:text-gray-400"
                >
                  <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  بازگشت به اخبار
                </Link>
                <Button href="/signup" size="sm" endIcon={<ArrowLeft className="h-4 w-4" />}>
                  شروع رایگان
                </Button>
              </div>
            </article>

            {/* ── Sidebar ── */}
            <aside className="mt-16 lg:mt-0">
              <div className="lg:sticky lg:top-8 space-y-6">

                {/* CTA */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-theme-purple-500 p-6 text-white">
                  <h3 className="text-lg font-bold">اولین اکانت MQTT خود را بسازید</h3>
                  <p className="mt-2 text-sm text-brand-100 leading-relaxed">
                    با mqttcloud.ir، دستگاه‌های خود را در چند ثانیه به بروکر متصل کنید.
                  </p>
                  <Button
                    href="/signup"
                    size="sm"
                    className="mt-4 w-full bg-none bg-white text-brand-600 hover:bg-brand-50"
                  >
                    شروع رایگان
                  </Button>
                </div>

                {/* Related news */}
                {related.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      اخبار دیگر
                    </h3>
                    <div className="space-y-3">
                      {related.map((n) => {
                        const relCfg = newsTagConfig[n.category];
                        return (
                          <Link
                            key={n.id}
                            href={`/news/${n.id}`}
                            className="group block overflow-hidden rounded-xl border border-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:hover:border-brand-700"
                          >
                            {n.image && (
                              <div className="relative h-24 w-full overflow-hidden">
                                <Image src={n.image} alt={n.title} fill sizes="280px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                              </div>
                            )}
                            <div className="p-4">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1.5 ${relCfg?.badge ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                                {stripHash(n.category)}
                              </span>
                              <p className="text-sm font-medium leading-snug text-gray-700 line-clamp-2 transition-colors group-hover:text-brand-500 dark:text-gray-300">
                                {n.title}
                              </p>
                              {n.publishedAt && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {formatDateFa(n.publishedAt)}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </aside>

          </div>
        </div>
      </div>
    </>
  );
}
