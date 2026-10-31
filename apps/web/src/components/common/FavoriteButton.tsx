"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { useFavoriteIds } from "@/lib/favorites";

/**
 * Heart toggle for saving a salon. Signed-out visitors are sent to sign in and brought back.
 * `variant="overlay"` sits on a photo (white disc); "plain" sits on a card.
 */
export default function FavoriteButton({ salonId, salonName, variant = "plain", className = "" }: { salonId: string; salonName: string; variant?: "overlay" | "plain"; className?: string }) {
  const token = useApiAccessToken();
  const router = useRouter();
  const { ids, toggle } = useFavoriteIds(token);
  const saved = ids.has(salonId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `حذف ${salonName} از سالن‌های محبوب` : `افزودن ${salonName} به سالن‌های محبوب`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) {
          router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        void toggle(salonId);
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
        variant === "overlay" ? "bg-white/90 shadow-md backdrop-blur" : "bg-app-card-2"
      } ${className}`}
    >
      <Heart className={`h-5 w-5 ${saved ? "fill-[#d6455d] text-[#d6455d]" : variant === "overlay" ? "text-[#2a1d26]" : "text-app-muted"}`} aria-hidden />
    </button>
  );
}
