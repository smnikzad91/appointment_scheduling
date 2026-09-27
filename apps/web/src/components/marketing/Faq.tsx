"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
    <section id="faq" className="bg-[#f7f0e8] py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
        <div>
          <span className="text-sm font-bold text-[#a34a30]">سؤالات متداول</span>
          <h2 className="mt-3 text-3xl font-extrabold text-[#2a1d26]">پاسخ پرسش‌های رایج</h2>
        </div>

        <div className="divide-y divide-black/5 md:col-span-2">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.question} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 text-start"
                >
                  <span className="font-bold text-[#2a1d26]">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {isOpen && <p className="mt-3 text-sm leading-relaxed text-gray-600">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
