"use client";

import { motion } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { defaultViewport, staggerContainer, staggerItem, useReducedMotionSafe } from "./motion";

interface StaggerProps {
  children: ReactNode;
  as?: ElementType;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
  className?: string;
}

export function Stagger({ children, as = "div", stagger = 0.08, delayChildren = 0, once = true, className }: StaggerProps) {
  const reduceMotion = useReducedMotionSafe();
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
      variants={staggerContainer(stagger, delayChildren)}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function StaggerItem({ children, as = "div", className }: StaggerItemProps) {
  const reduceMotion = useReducedMotionSafe();
  const MotionTag = motion[as as "div"] ?? motion.div;

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag className={className} variants={staggerItem}>
      {children}
    </MotionTag>
  );
}
