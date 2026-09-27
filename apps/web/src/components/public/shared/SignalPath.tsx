"use client";

import { motion } from "framer-motion";
import { easeSignal, useReducedMotionSafe } from "./motion";

interface SignalPathProps {
  variant: "loader";
  size?: "sm" | "md";
  className?: string;
}

const barHeights = [8, 14, 20, 26];

function SignalBars({ animate, loop }: { animate: boolean; loop?: boolean }) {
  return (
    <g>
      {barHeights.map((h, i) => (
        <motion.rect
          key={i}
          x={-2 + i * 7}
          width={4}
          rx={2}
          fill="currentColor"
          initial={{ height: 4, y: -2 }}
          animate={
            animate
              ? loop
                ? { height: [4, h, 4], y: [-2, -h / 2, -2] }
                : { height: h, y: -h / 2 }
              : { height: 4, y: -2 }
          }
          transition={
            loop
              ? { duration: 1.2, repeat: Infinity, repeatType: "loop", delay: i * 0.12, ease: easeSignal }
              : { duration: 0.35, delay: 0.55 + i * 0.08, ease: easeSignal }
          }
        />
      ))}
    </g>
  );
}

export function SignalPath({ size = "md", className }: SignalPathProps) {
  const reduceMotion = useReducedMotionSafe();
  const dim = size === "sm" ? 28 : 40;

  return (
    <svg width={dim} height={dim} viewBox="-16 -16 32 32" className={`text-brand-500 ${className ?? ""}`}>
      <SignalBars animate={!reduceMotion} loop />
    </svg>
  );
}
