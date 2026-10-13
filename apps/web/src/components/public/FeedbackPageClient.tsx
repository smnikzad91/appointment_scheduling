"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Heart, Lightbulb, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { FloatingInput, FloatingTextArea } from "@/components/guest/fields";
import GradientButton from "@/components/guest/GradientButton";
import { easeSignal } from "@/components/public/shared/motion";
import { toastError } from "@/lib/toastError";
import { toPersianDigits } from "@/lib/persian";
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABEL,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_ROLES,
  FEEDBACK_ROLE_LABEL,
  type FeedbackKind,
  type FeedbackRole,
} from "@/lib/feedback";

// «نظرات و پیشنهادات» (/feedback): POST /api/public/feedback, read by the admin at /admin/feedback.

const notes = [
  { icon: Lightbulb, text: "هر پیشنهاد را می‌خوانیم" },
  { icon: Heart, text: "نوبتت را با نظر شما می‌سازیم" },
  { icon: ShieldCheck, text: "نام و شماره اختیاری است" },
];

export default function FeedbackPageClient() {
  const [kind, setKind] = useState<FeedbackKind>("SUGGESTION");
  const [role, setRole] = useState<FeedbackRole | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < FEEDBACK_MESSAGE_MIN) {
      toastError("متن پیام را بنویسید");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, role, name, phone, message, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(data.error ?? "ارسال نشد؛ دوباره تلاش کنید");
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      toastError("اتصال برقرار نشد؛ دوباره تلاش کنید");
    } finally {
      setSending(false);
    }
  };

  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-2 text-sm transition ${
      on ? "border-g-accent bg-g-accent/10 font-bold text-g-ink" : "border-g-line-strong text-g-muted hover:border-g-accent/50"
    }`;

  return (
    <div className="relative overflow-hidden">
      <Container size="sm" className="relative pb-24 pt-20">
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-g-accent">
            صدای شما
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-g-ink sm:text-5xl">نظرات و پیشنهادات</h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-g-muted">
            چه چیزی را دوست دارید، چه چیزی اذیتتان می‌کند و چه امکانی کم است؟ برایمان بنویسید.
          </p>
        </Reveal>

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
                <h2 className="text-xl font-bold text-gray-900 dark:text-g-ink">ممنون از نظرتان!</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-g-muted">پیامتان به دست تیم نوبتت رسید.</p>
                <Button variant="secondary" size="sm" className="mt-6" onClick={() => setSent(false)}>
                  ارسال نظر دیگر
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
                className="g-glass g-glow-border flex flex-col gap-5 rounded-[28px] p-6 sm:p-8"
              >
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 px-1 text-[13px] text-g-muted">
                    نوع پیام<span className="text-g-danger"> *</span>
                  </legend>
                  <div role="radiogroup" aria-label="نوع پیام" className="flex flex-wrap gap-2">
                    {FEEDBACK_KINDS.map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
                        {FEEDBACK_KIND_LABEL[k].fa}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 px-1 text-[13px] text-g-muted">شما… (اختیاری)</legend>
                  <div role="radiogroup" aria-label="شما" className="flex flex-wrap gap-2">
                    {FEEDBACK_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={role === r}
                        onClick={() => setRole(role === r ? null : r)}
                        className={chip(role === r)}
                      >
                        {FEEDBACK_ROLE_LABEL[r].fa}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="نام (اختیاری)" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                  <FloatingInput
                    label="موبایل (اختیاری)"
                    hint="اگر پاسخ می‌خواهید"
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <FloatingTextArea
                    label="نظر یا پیشنهاد شما"
                    hint="هر چه دوست دارید بنویسید…"
                    required
                    rows={6}
                    maxLength={FEEDBACK_MESSAGE_MAX}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="mt-1.5 px-1 text-end text-xs text-g-faint">
                    {toPersianDigits(message.length)} / {toPersianDigits(FEEDBACK_MESSAGE_MAX)}
                  </p>
                </div>

                {/* honeypot: hidden from people, bots fill it */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  data-no-draft
                  className="hidden"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />

                <div className="mt-1 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-g-faint">
                    سوال یا مشکل حساب دارید؟ از{" "}
                    <Link href="/contact" className="text-g-accent hover:underline">
                      تماس با ما
                    </Link>{" "}
                    استفاده کنید.
                  </p>
                  <GradientButton type="submit" loading={sending} loadingLabel="در حال ارسال…" className="sm:w-auto sm:px-8">
                    ارسال نظر
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </GradientButton>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>

        <Reveal delay={0.2} className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-g-muted">
          {notes.map((item) => (
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
