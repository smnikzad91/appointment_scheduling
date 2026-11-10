"use client";

import { useEffect, useRef, useState } from "react";
import { ding, primeSound } from "@/lib/livechat/ding";

/**
 * Admin sidebar badge for «گفتگوی آنلاین»: conversations waiting for a reply, re-checked every 15 s
 * while the tab is visible. Chimes when a newer visitor message shows up (the first check only sets
 * the baseline).
 */
export function useWaitingChats() {
  const [n, setN] = useState(0);
  const lastSeen = useRef<number | null>(null);
  useEffect(() => {
    primeSound();
    let stop = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/livechat/waiting", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { n?: number; last?: number } | null) => {
          if (stop || typeof d?.n !== "number") return;
          setN(d.n);
          const last = d.last ?? 0;
          if (lastSeen.current !== null && last > lastSeen.current) ding("admin");
          lastSeen.current = Math.max(lastSeen.current ?? 0, last);
        })
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return n;
}
