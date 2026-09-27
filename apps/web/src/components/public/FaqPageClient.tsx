"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Accordion, type AccordionItemData } from "@/components/public/shared/Accordion";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { SignalPath } from "@/components/public/shared/SignalPath";

export default function FaqPageClient() {
  const [faqs, setFaqs] = useState<AccordionItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/faqs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFaqs(data.map((f) => ({ id: f._id, question: f.question, answer: f.answer })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[360px] w-[360px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-140px)] -top-10 h-[280px] w-[280px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <Container size="md" className="relative pb-24 pt-20">

        {/* Header */}
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            پرسش و پاسخ
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            سوالات متداول
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400">
            پاسخ رایج‌ترین سوال‌ها درباره mqttcloud.ir را اینجا پیدا کنید.
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            پاسخ سوال خود را نیافتید؟{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              با ما در تماس باشید
            </Link>
          </p>
        </Reveal>

        {/* FAQ list */}
        <div className="mt-12">
          {loading && (
            <div className="flex justify-center py-16">
              <SignalPath variant="loader" />
            </div>
          )}

          {!loading && faqs.length === 0 && (
            <div className="py-20 text-center text-gray-400 dark:text-gray-500">
              سوالی برای نمایش وجود ندارد.
            </div>
          )}

          {!loading && faqs.length > 0 && (
            <Reveal delay={0.05}>
              <Accordion items={faqs} />
            </Reveal>
          )}
        </div>

        {/* CTA strip */}
        {!loading && (
          <Reveal delay={0.1} className="mt-16 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-theme-purple-500/5 px-8 py-10 text-center dark:border-brand-800/30 dark:from-brand-500/5 dark:to-theme-purple-500/5">
            <p className="text-base font-semibold text-gray-800 dark:text-white">
              هنوز سوال دارید؟
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              تیم پشتیبانی ما آماده پاسخگویی است.
            </p>
            <Button href="/contact" className="mt-5" endIcon={<ArrowLeft className="h-4 w-4" />}>
              تماس با ما
            </Button>
          </Reveal>
        )}
      </Container>
    </div>
  );
}
