"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Mail, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { FloatingInput, FloatingTextArea } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import { easeSignal } from "@/components/public/shared/motion";
import { toastError } from "@/lib/toastError";

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
  const [sent, setSent] = useState(false);

  const set = (field: Field, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    const res = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(data.error ?? "خطایی رخ داد. دوباره تلاش کنید.");
      return;
    }
    setSent(true);
    setForm(defaultForm);
  };

  return (
    <div className="relative overflow-hidden">

      <Container size="sm" className="relative pb-24 pt-20">

        {/* Header */}
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-g-accent">
            ارتباط با ما
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-g-ink sm:text-5xl">
            تماس با ما
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-g-muted">
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
                className="g-glass g-glow-border rounded-[28px] px-8 py-12 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-g-success/15">
                  <Check className="h-8 w-8 text-g-success" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-g-ink">پیام شما ارسال شد!</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-g-muted">
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
                className="g-glass g-glow-border flex flex-col gap-4 rounded-[28px] p-6 sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="نام و نام خانوادگی" autoComplete="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                  <FloatingInput
                    label="ایمیل"
                    hint="example@email.com"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <FloatingInput label="موضوع" hint="مثلاً: سوال درباره پلن حرفه‌ای" required value={form.subject} onChange={(e) => set("subject", e.target.value)} />
                <FloatingTextArea label="پیام" hint="پیام خود را اینجا بنویسید…" required rows={6} value={form.message} onChange={(e) => set("message", e.target.value)} />


                <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-g-faint">
                    با ارسال این فرم با{" "}
                    <Link href="/privacy" className="text-g-accent hover:underline">حریم خصوصی</Link>{" "}
                    ما موافقت می‌کنید.
                  </p>
                  <GradientButton type="submit" loading={sending} loadingLabel="در حال ارسال…" className="sm:w-auto sm:px-8">
                    ارسال پیام
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </GradientButton>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>

        {/* Contact info strip */}
        <Reveal delay={0.2} className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-g-muted">
          {contactInfo.map((item) => (
            <span key={item.text} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-gray-400 dark:text-g-faint" aria-hidden="true" />
              {item.text}
            </span>
          ))}
        </Reveal>
      </Container>
    </div>
  );
}
