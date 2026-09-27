"use client";

import type React from "react";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const savedListeners = new Set<() => void>();
function subscribeSaved(cb: () => void) {
  savedListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    savedListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readSaved(): Theme | null {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function readSystemDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // A saved choice (from the theme toggle) wins; otherwise follow the phone's light/dark setting,
  // live. Nothing is saved until the user toggles, so the system setting keeps applying.
  const saved = useSyncExternalStore(subscribeSaved, readSaved, () => null);
  const systemDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => true);
  const theme: Theme = saved ?? (systemDark ? "dark" : "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    try {
      localStorage.setItem("theme", theme === "light" ? "dark" : "light");
    } catch {
      // Storage blocked — nothing to persist.
    }
    savedListeners.forEach((cb) => cb());
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
