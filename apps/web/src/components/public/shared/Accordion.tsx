"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { easeSignal } from "./motion";

export interface AccordionItemData {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItemData[];
  variant?: "default" | "compact";
  className?: string;
}

export function Accordion({ items, variant = "default", className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div
      className={`divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900 ${className ?? ""}`}
    >
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              onClick={() => setOpenId(open ? null : item.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 text-right ${
                variant === "compact" ? "px-5 py-4" : "px-6 py-5"
              }`}
              aria-expanded={open}
            >
              <span
                className={`text-sm font-semibold leading-relaxed transition-colors ${
                  open ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"
                }`}
              >
                {item.question}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                  open ? "bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <motion.svg
                  className="h-3.5 w-3.5 scale-x-[-1]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={{ duration: 0.2, ease: easeSignal }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </motion.svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: easeSignal }}
                  className="overflow-hidden"
                >
                  <p className={`text-sm leading-relaxed text-gray-500 dark:text-gray-400 ${variant === "compact" ? "px-5 pb-4" : "px-6 pb-5"}`}>
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
