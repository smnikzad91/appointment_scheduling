"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { easeSignal, useReducedMotionSafe } from "./motion";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(n: number, decimals: number) {
  return n.toFixed(decimals).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

interface CountUpProps {
  /** Persian-numeral string, e.g. "۹۹.۲٪", "×۳", "۱.۸s" — animates the numeric part, keeps prefix/suffix static. */
  value: string;
  duration?: number;
  className?: string;
  /** Play the count-up regardless of the user's reduced-motion preference. Use sparingly, only for purely decorative hero flourishes. */
  forceMotion?: boolean;
}

export function CountUp({ value, duration = 1.4, className, forceMotion = false }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotionPreferred = useReducedMotionSafe();
  const reduceMotion = forceMotion ? false : reduceMotionPreferred;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const westernized = value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
    const match = westernized.match(/^(\D*)([\d.]+)(.*)$/);
    if (!match) return;

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    if (Number.isNaN(target)) return;
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

    const controls = animate(0, target, {
      duration,
      ease: easeSignal,
      onUpdate: (v) => setDisplay(`${prefix}${toPersianDigits(v, decimals)}${suffix}`),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
