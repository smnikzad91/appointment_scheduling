"use client";

import { motion } from "framer-motion";
import { Cpu, Radio, ShieldCheck, Wifi } from "lucide-react";
import { useReducedMotionSafe } from "@/components/public/shared/motion";

const icons = [
  { Icon: Radio, className: "-left-3 -top-3 sm:-left-6 sm:-top-6 md:-left-10 md:-top-8", gradient: "from-brand-500 to-brand-600", duration: 5.5, delay: 0 },
  { Icon: Cpu, className: "-right-2 top-8 sm:-right-4 sm:top-10 md:-right-8 md:top-16", gradient: "from-theme-purple-500 to-brand-500", duration: 6.5, delay: 0.6 },
  { Icon: ShieldCheck, className: "-left-4 bottom-12 sm:-left-8 sm:bottom-16 md:-left-12 md:bottom-24", gradient: "from-theme-pink-500 to-theme-purple-500", duration: 6, delay: 1.1 },
  { Icon: Wifi, className: "-right-3 -bottom-3 sm:-right-6 sm:-bottom-6 md:-right-10 md:-bottom-8", gradient: "from-success-500 to-brand-500", duration: 5, delay: 0.3 },
] as const;

/** Small gradient icon chips that gently float around the hero preview card — purely decorative motion graphics. */
export function HeroFloatingIcons({ forceMotion = false }: { forceMotion?: boolean }) {
  const reduceMotionPreferred = useReducedMotionSafe();
  const reduceMotion = forceMotion ? false : reduceMotionPreferred;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {icons.map(({ Icon, className, gradient, duration, delay }, i) => (
        <motion.div
          key={i}
          className={`absolute flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br sm:h-12 sm:w-12 sm:rounded-2xl ${gradient} text-white shadow-lg shadow-brand-500/25 ${className}`}
          animate={
            reduceMotion
              ? undefined
              : { y: [0, -14, 0], rotate: [0, i % 2 === 0 ? 6 : -6, 0] }
          }
          transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </motion.div>
      ))}
    </div>
  );
}
