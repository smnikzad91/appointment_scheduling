import { Star } from "lucide-react";
import type { Review } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">{review.customerName}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-700"}`} aria-hidden />
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{review.comment}</p>
      <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
        {toPersianDigits(formatSalonDate(review.createdAt))}
      </span>
    </div>
  );
}
