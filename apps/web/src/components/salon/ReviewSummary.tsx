import { Star } from "lucide-react";
import type { Review } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";

export default function ReviewSummary({ reviews, ratingAverage, ratingCount }: { reviews: Review[]; ratingAverage: number; ratingCount: number }) {
  const distribution = [5, 4, 3, 2, 1].map((star) => reviews.filter((r) => Math.round(r.rating) === star).length);
  const max = Math.max(...distribution, 1);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-col items-center sm:w-32">
        <span className="text-3xl font-bold">{toPersianDigits(ratingAverage.toFixed(1))}</span>
        <div className="mt-1 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-4 w-4 ${i <= Math.round(ratingAverage) ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-700"}`} aria-hidden />
          ))}
        </div>
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{toPersianDigits(ratingCount)} نظر</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star, i) => (
          <div key={star} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-6 text-end">{toPersianDigits(star)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${(distribution[i] / max) * 100}%`, backgroundColor: "var(--salon-brand)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
