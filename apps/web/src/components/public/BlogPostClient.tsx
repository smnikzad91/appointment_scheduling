"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/data/blogPosts";
import { ReadingProgress } from "@/components/public/shared/ReadingProgress";
import { Reveal } from "@/components/public/shared/Reveal";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { blogCategoryConfig, stripHash, formatDateFa } from "@/components/public/shared/contentTaxonomy";

function slugify(str: string) {
  return str.replace(/\s+/g, "-");
}

function TableOfContents({ headings, activeId }: { headings: string[]; activeId: string }) {
  if (headings.length === 0) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        فهرست مطالب
      </h3>
      <nav className="space-y-1">
        {headings.map((h) => {
          const id = slugify(h);
          const isActive = activeId === id;
          return (
            <a
              key={h}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-brand-50 font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 ${
                  isActive ? "bg-brand-500 scale-125" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span className="line-clamp-2">{h}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

interface Props {
  post: BlogPost;
  related: BlogPost[];
}

export default function BlogPostClient({ post, related }: Props) {
  const headings = (post.sections ?? []).map((s) => s.heading).filter(Boolean) as string[];
  const [activeId, setActiveId] = useState(headings[0] ? slugify(headings[0]) : "");
  const articleRef = useRef<HTMLElement>(null);
  const categoryCfg = blogCategoryConfig[post.category];

  useEffect(() => {
    if (headings.length === 0) return;
    const observers: IntersectionObserver[] = [];
    headings.forEach((h) => {
      const el = document.getElementById(slugify(h));
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveId(slugify(h)); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [headings.join()]);

  return (
    <>
      <ReadingProgress />

      <div className="relative overflow-hidden">
        {/* Header banner */}
        {post.coverImage
          ? <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden">
              <Image src={post.coverImage} alt={post.title} fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-white dark:to-gray-900" />
            </div>
          : <>
              <AmbientGlow className="left-[calc(50%-260px)] top-0 h-72 w-[520px] bg-brand-500/10 blur-3xl dark:bg-brand-500/15" duration={20} />
              <AmbientGlow className="left-[calc(50%+40px)] top-10 h-56 w-[420px] bg-theme-purple-500/8 blur-3xl dark:bg-theme-purple-500/10" duration={26} />
            </>
        }

        <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${post.coverImage ? "-mt-16 pb-16" : "py-16"}`}>
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-14">

            {/* ── Main article ── */}
            <article ref={articleRef}>

              {/* Breadcrumb */}
              <Reveal as="nav" className="mb-8 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <Link href="/" className="transition-colors hover:text-brand-500">خانه</Link>
                <span>/</span>
                <Link href="/blog" className="transition-colors hover:text-brand-500">وبلاگ</Link>
                <span>/</span>
                <span className="line-clamp-1 text-gray-600 dark:text-gray-300">{post.title}</span>
              </Reveal>

              {/* Header */}
              <Reveal as="header" delay={0.06} className="mb-12">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryCfg?.badge ?? "bg-gray-100 text-gray-600"}`}>
                    {stripHash(post.category)}
                  </span>
                  {post.highlight && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                      پست ویژه
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-extrabold leading-snug text-gray-900 dark:text-white sm:text-4xl">
                  {post.title}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {post.createdAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {formatDateFa(post.createdAt)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
                    </svg>
                    {post.readTime} مطالعه
                  </span>
                </div>

                <p className="mt-6 border-r-4 border-brand-400 pr-5 text-lg leading-relaxed text-gray-500 dark:text-gray-400">
                  {post.excerpt}
                </p>
              </Reveal>

              {/* Body */}
              <Reveal delay={0.1} className="space-y-10">
                {(post.sections ?? []).map((section, i) => (
                  <section key={i}>
                    {section.heading && (
                      <h2
                        id={slugify(section.heading)}
                        className="mb-4 scroll-mt-8 text-xl font-bold text-gray-800 dark:text-white"
                      >
                        <a
                          href={`#${slugify(section.heading)}`}
                          className="group inline-flex items-center gap-2 hover:text-brand-500 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(slugify(section.heading!))?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          {section.heading}
                          <span className="opacity-0 text-brand-400 text-base group-hover:opacity-100 transition-opacity">#</span>
                        </a>
                      </h2>
                    )}
                    {section.image && (
                      <div className="relative mb-5 h-80 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                        <Image
                          src={section.image}
                          alt={section.heading ?? post.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 800px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="text-gray-600 dark:text-gray-300 leading-8 whitespace-pre-line">
                      {section.body}
                    </div>
                    {i < (post.sections ?? []).length - 1 && section.heading && (
                      <div className="mt-10 h-px bg-gradient-to-l from-transparent via-gray-200 to-transparent dark:via-gray-700" />
                    )}
                  </section>
                ))}
              </Reveal>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2">
                  {post.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    >
                      #{stripHash(tag)}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer bar */}
              <div className="mt-14 flex items-center justify-between border-t border-gray-100 pt-8 dark:border-gray-800">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-brand-400 hover:text-brand-500 hover:-translate-x-0.5 dark:border-gray-700 dark:text-gray-400"
                >
                  <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  بازگشت به وبلاگ
                </Link>
                <Button href="/signup" size="sm" endIcon={<ArrowLeft className="h-4 w-4" />}>
                  شروع رایگان
                </Button>
              </div>
            </article>

            {/* ── Sidebar ── */}
            <aside className="mt-16 lg:mt-0">
              <div className="lg:sticky lg:top-8 space-y-6">

                {/* ToC */}
                <TableOfContents headings={headings} activeId={activeId} />

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

                {/* Related */}
                {related.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      مقالات مرتبط
                    </h3>
                    <div className="space-y-3">
                      {related.map((p) => (
                        <Link
                          key={p.slug}
                          href={`/blog/${p.slug}`}
                          className="group block overflow-hidden rounded-xl border border-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:hover:border-brand-700"
                        >
                          {p.coverImage && (
                            <div className="relative h-28 w-full overflow-hidden">
                              <Image src={p.coverImage} alt={p.title} fill sizes="280px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                            </div>
                          )}
                          <div className="p-4">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1.5 ${
                                blogCategoryConfig[p.category]?.badge ?? "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {stripHash(p.category)}
                            </span>
                            <p className="text-sm font-medium leading-snug text-gray-700 line-clamp-2 transition-colors group-hover:text-brand-500 dark:text-gray-300">
                              {p.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
                                </svg>
                                {p.readTime} مطالعه
                              </span>
                              {p.createdAt && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {formatDateFa(p.createdAt, "short")}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
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
