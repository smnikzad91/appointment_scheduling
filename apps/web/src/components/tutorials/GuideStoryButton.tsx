"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { tutorialBySlug } from "@/content/tutorials";
import StoryPlayer, { slidesOf } from "./StoryPlayer";

/** «پخش به‌صورت استوری» on a guide page: its cover and steps in the full-screen story player. */
export default function GuideStoryButton({ slug, step, className = "" }: { slug: string; step?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const t = tutorialBySlug(slug);
  if (!t) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)] px-5 text-sm font-black text-[#1a0f14] shadow-[0_14px_30px_-12px_rgb(198_138_114/0.8)] transition hover:brightness-105 ${className}`}
      >
        <Play className="h-4 w-4 fill-current" aria-hidden />
        پخش به‌صورت استوری
      </button>
      {open && <StoryPlayer slides={slidesOf([t])} start={step === undefined ? 0 : step + 1} onClose={() => setOpen(false)} />}
    </>
  );
}
