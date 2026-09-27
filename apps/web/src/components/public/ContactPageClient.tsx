"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Mail, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";
import { easeSignal } from "@/components/public/shared/motion";

type Field = "name" | "email" | "subject" | "message";

const defaultForm = { name: "", email: "", subject: "", message: "" };

const contactInfo = [
  { icon: Mail, text: "پاسخ در کمتر از ۲۴ ساعت" },
  { icon: Lock, text: "اطلاعات شما محرمانه است" },
  { icon: MessageCircle, text: "پشتیبانی از طریق تلگرام" },
];

export default function ContactPageClient() {
  const [form, setForm] = useState(defaultForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  const set = (field: Field, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSending(true);
    const res = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "خطایی رخ داد. دوباره تلاش کنید.");
      return;
    }
    setSent(true);
    setForm(defaultForm);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/15 dark:via-gray-900 dark:to-gray-900" />
      <AmbientGlow className="-left-24 -top-24 h-[360px] w-[360px] bg-brand-500/15 blur-[110px] dark:bg-brand-500/15" duration={20} />
      <AmbientGlow className="left-[calc(50%-140px)] -top-10 h-[280px] w-[280px] bg-theme-purple-500/10 blur-[110px] dark:bg-theme-purple-500/10" duration={25} />

      <Container size="sm" className="relative pb-24 pt-20">

        {/* Header */}
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-brand-400">
            ارتباط با ما
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            تماس با ما
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400">
            سوال، پیشنهاد یا مشکلی دارید؟ پیام بفرستید — ظرف ۲۴ ساعت پاسخ می‌دهیم.
          </p>
        </Reveal>

        {/* Form / Success */}
        <Reveal delay={0.1} className="mt-12">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: easeSignal }}
                className="rounded-2xl border border-success-200 bg-success-50 px-8 py-12 text-center dark:border-success-800/30 dark:bg-success-500/5"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/15">
                  <Check className="h-8 w-8 text-success-500" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">پیام شما ارسال شد!</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  به زودی با شما تماس می‌گیریم.
                </p>
                <Button variant="secondary" size="sm" className="mt-6" onClick={() => setSent(false)}>
                  ارسال پیام جدید
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: easeSignal }}
                onSubmit={handleSubmit}
                className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className={labelClass}>نام و نام خانوادگی *</label>
                    <input
                      id="contact-name"
                      required type="text" value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className={inputClass} placeholder="مثلاً: علی محمدی"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className={labelClass}>ایمیل *</label>
                    <input
                      id="contact-email"
                      required type="email" value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={inputClass} placeholder="example@email.com" dir="ltr"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="contact-subject" className={labelClass}>موضوع *</label>
                  <input
                    id="contact-subject"
                    required type="text" value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    className={inputClass} placeholder="مثلاً: سوال درباره پلن حرفه‌ای"
                  />
                </div>

                <div className="mt-5">
                  <label htmlFor="contact-message" className={labelClass}>پیام *</label>
                  <textarea
                    id="contact-message"
                    required rows={6} value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="پیام خود را اینجا بنویسید…"
                  />
                </div>

                {error && (
                  <p className="mt-3 rounded-xl bg-error-50 px-4 py-2 text-sm text-error-500 dark:bg-error-500/10">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    با ارسال این فرم با{" "}
                    <Link href="/privacy" className="text-brand-500 hover:underline">حریم خصوصی</Link>{" "}
                    ما موافقت می‌کنید.
                  </p>
                  <Button
                    type="submit"
                    loading={sending}
                    endIcon={<ArrowLeft className="h-4 w-4" />}
                  >
                    {sending ? "در حال ارسال…" : "ارسال پیام"}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>

        {/* Contact info strip */}
        <Reveal delay={0.2} className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          {contactInfo.map((item) => (
            <span key={item.text} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              {item.text}
            </span>
          ))}
        </Reveal>
      </Container>
    </div>
  );
}
