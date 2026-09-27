import { Stars } from "@/components/common/StarRating";
import type { Review } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">{review.customerName}</span>
        <Stars value={review.rating} size={14} />
      </div>
      {review.comment && <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{review.comment}</p>}
      <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
        {toPersianDigits(formatSalonDate(review.createdAt))}
      </span>
    </div>
  );
}
