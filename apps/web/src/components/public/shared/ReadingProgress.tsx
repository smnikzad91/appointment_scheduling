"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 280, damping: 40, restDelta: 0.001 });

  return (
    <div className="fixed top-0 right-0 left-0 z-50 h-0.5 bg-gray-200/50 dark:bg-gray-800/50">
      <motion.div className="h-full origin-right bg-brand-500" style={{ scaleX }} />
    </div>
  );
}
