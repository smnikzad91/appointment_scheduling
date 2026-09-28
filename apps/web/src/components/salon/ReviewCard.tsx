import { Stars } from "@/components/common/StarRating";
import type { Review } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-g-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{review.customerName}</span>
        {review.rating !== null && <Stars value={review.rating} size={14} />}
      </div>
      {review.comment && <p className="mt-2 text-sm leading-relaxed text-g-muted">{review.comment}</p>}
      <span className="mt-2 block text-xs text-g-faint">
        {toPersianDigits(formatSalonDate(review.createdAt))}
      </span>
    </div>
  );
}
