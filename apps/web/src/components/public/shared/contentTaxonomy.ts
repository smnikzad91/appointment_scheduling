import {
  BookOpen,
  LifeBuoy,
  Link2,
  Rocket,
  Sparkles,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface CategoryConfig {
  badge: string;
  gradient: string;
  icon: LucideIcon;
  light: string;
}

export const blogCategoryConfig: Record<string, CategoryConfig> = {
  "آموزش": {
    badge: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    gradient: "from-g-accent-3 via-g-accent to-g-accent-2",
    icon: BookOpen,
    light: "bg-brand-50 dark:bg-brand-500/10",
  },
  "استراتژی": {
    badge: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300",
    gradient: "from-success-500 to-teal-600",
    icon: Target,
    light: "bg-success-50 dark:bg-success-500/10",
  },
  "معرفی": {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    gradient: "from-g-accent-2 to-[#7e58d2]",
    icon: Sparkles,
    light: "bg-violet-50 dark:bg-violet-500/10",
  },
};

export const newsTagConfig: Record<string, CategoryConfig> = {
  "راه‌اندازی": {
    badge: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    gradient: "from-g-accent-3 via-g-accent to-g-accent-2",
    icon: Rocket,
    light: "bg-brand-50 dark:bg-brand-500/10",
  },
  "قابلیت جدید": {
    badge: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300",
    gradient: "from-success-500 to-teal-600",
    icon: Sparkles,
    light: "bg-success-50 dark:bg-success-500/10",
  },
  "اتصال": {
    badge: "bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-500/20 dark:text-blue-light-300",
    gradient: "from-[#5fb3a8] to-[#2f6f68]",
    icon: Link2,
    light: "bg-blue-light-50 dark:bg-blue-light-500/10",
  },
  "نگهداری": {
    badge: "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300",
    gradient: "from-orange-400 to-amber-500",
    icon: Wrench,
    light: "bg-warning-50 dark:bg-warning-500/10",
  },
  "پشتیبانی": {
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
    gradient: "from-gray-500 to-slate-600",
    icon: LifeBuoy,
    light: "bg-gray-50 dark:bg-gray-500/10",
  },
};

export function stripHash(value?: string | null) {
  return (value ?? "").replace(/^#/, "");
}

export function formatDateFa(iso?: string | null, style: "long" | "short" = "long") {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: style,
    day: "numeric",
  }).format(new Date(iso));
}
