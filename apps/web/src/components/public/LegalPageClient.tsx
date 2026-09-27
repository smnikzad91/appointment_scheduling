"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { SignalPath } from "@/components/public/shared/SignalPath";

interface LegalData {
  title: string;
  content: string;
  updatedAt?: string;
}

function renderContent(content: string) {
  return content
    .split(/\n\n+/)
    .map((para, i) => (
      <p key={i} className="leading-8 text-gray-600 dark:text-gray-400 whitespace-pre-line">
        {para.trim()}
      </p>
    ));
}

export default function LegalPageClient({ type }: { type: "privacy" | "terms" }) {
  const [data, setData] = useState<LegalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/legal/${type}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type]);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-brand-50/50 via-white to-white dark:from-brand-950/10 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="left-[calc(50%-180px)] -top-16 h-[300px] w-[360px] bg-brand-500/10 blur-[110px] dark:bg-brand-500/10" duration={24} />

      <Container size="md" className="relative pb-24 pt-20">

        {loading ? (
          <div className="flex justify-center py-16">
            <SignalPath variant="loader" />
          </div>
        ) : !data?.title && !data?.content ? (
          <div className="py-24 text-center">
            <p className="text-gray-400 dark:text-gray-500">
              {type === "privacy" ? "حریم خصوصی" : "شرایط استفاده"} هنوز تنظیم نشده است.
            </p>
          </div>
        ) : (
          <Reveal>
            {/* Header */}
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                {data.title}
              </h1>
              {data.updatedAt && (
                <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                  آخرین بروزرسانی:{" "}
                  {new Date(data.updatedAt).toLocaleDateString("fa-IR", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              )}
            </div>

            {/* Content */}
            <article className="space-y-5 text-base" dir="rtl">
              {data.content ? renderContent(data.content) : null}
            </article>

            {/* Back link */}
            <div className="mt-16 flex justify-center gap-4 text-sm">
              <Link
                href="/"
                className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                بازگشت به صفحه اصلی
              </Link>
              <Button href="/contact">تماس با ما</Button>
            </div>
          </Reveal>
        )}
      </Container>
    </div>
  );
}
