"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHead from "./SectionHead";

const FAQS = [
  {
    question: "مشتری چطور نوبت می‌گیرد؟",
    answer: "از لینک سالن یا اپ مشتری، خدمت و آرایشگر و ساعت خالی را انتخاب می‌کند و با کد پیامکی شماره موبایلش را تأیید می‌کند.",
  },
  {
    question: "امکان تغییر یا لغو نوبت هست؟",
    answer: "بله، تا زمانی که سالن تعیین می‌کند. قوانین بازگشت بیعانه را هم خود سالن تنظیم می‌کند.",
  },
  {
    question: "پرداخت بیعانه از چه درگاهی انجام می‌شود؟",
    answer: "از درگاه‌های بانکی داخلی و با همه کارت‌های عضو شتاب.",
  },
  {
    question: "سالن ما فقط بانوان است؛ عکس آرایشگرها نمایش داده می‌شود؟",
    answer: "نمایش عکس و پروفایل عمومی آرایشگرها اختیاری است و می‌توانید آن را خاموش کنید.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-3">
        <SectionHead kicker="سؤالات متداول" title="پاسخ پرسش‌های رایج" />

        <div className="flex flex-col gap-3 md:col-span-2">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.question}
                className={`g-reveal rounded-2xl border transition-colors duration-300 ${
                  isOpen ? "border-g-accent/30 bg-white/[0.05]" : "border-g-line bg-g-glass-soft hover:border-g-line-strong"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                >
                  <span className="font-bold text-g-ink">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-g-accent" : "text-g-faint"}`}
                    aria-hidden
                  />
                </button>
                {/* grid-rows 0fr→1fr animates the height without measuring it */}
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-7 text-g-muted">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
