"use client";

import { motion } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { defaultViewport, fadeUp, useReducedMotionSafe } from "./motion";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
  /** Play the entrance regardless of the user's reduced-motion preference. Use sparingly, only for purely decorative hero flourishes. */
  forceMotion?: boolean;
}

export function Reveal({ children, as = "div", delay = 0, y = 20, once = true, className, forceMotion = false }: RevealProps) {
  const reduceMotionPreferred = useReducedMotionSafe();
  const reduceMotion = forceMotion ? false : reduceMotionPreferred;
  const MotionTag = motion[as as "div"] ?? motion.div;

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: defaultViewport.margin }}
      variants={fadeUp(delay, y)}
    >
      {children}
    </MotionTag>
  );
}
