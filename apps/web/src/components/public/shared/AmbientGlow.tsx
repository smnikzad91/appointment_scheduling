"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "./motion";

interface AmbientGlowProps {
  /** Positioning, size, and color via utility classes, e.g. "-left-24 -top-24 h-[420px] w-[420px] bg-brand-500/10 blur-[110px]" */
  className?: string;
  duration?: number;
  /** Play the drift regardless of the user's reduced-motion preference. Use sparingly, only for purely decorative hero flourishes. */
  forceMotion?: boolean;
}

/** Slow-drifting blurred glow blob for ambient hero/section backgrounds. Static when reduced motion is preferred (unless forceMotion). */
export function AmbientGlow({ className, duration = 18, forceMotion = false }: AmbientGlowProps) {
  const reduceMotionPreferred = useReducedMotionSafe();
  const reduceMotion = forceMotion ? false : reduceMotionPreferred;

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${className ?? ""}`}
      animate={
        reduceMotion
          ? undefined
          : { x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.08, 0.96, 1] }
      }
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
