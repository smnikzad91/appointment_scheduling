-- A review can be a rating only, a comment only, or both — but never neither.
ALTER TABLE "reviews" ALTER COLUMN "rating" DROP NOT NULL;

-- Legacy rows may carry an empty-string comment; treat that as no comment.
UPDATE "reviews" SET "comment" = NULL WHERE btrim("comment") = '';

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_or_comment"
  CHECK ("rating" IS NOT NULL OR "comment" IS NOT NULL);

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range"
  CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
