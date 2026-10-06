import type { Salon } from "@/types/salon";
import ReviewSummary from "./ReviewSummary";
import ReviewCard from "./ReviewCard";

export default function Reviews({ salon }: { salon: Salon }) {
  return (
    <section id="reviews" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">نظرات مشتریان</h2>
      {salon.ratingCount > 0 && <ReviewSummary reviews={salon.reviews} ratingAverage={salon.ratingAverage} ratingCount={salon.ratingCount} />}

      {salon.reviews.length === 0 ? (
        <p className="mt-6 text-center text-sm text-g-muted">هنوز نظری ثبت نشده است.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {salon.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}
