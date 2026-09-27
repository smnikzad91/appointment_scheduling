/**
 * "Top rated" ranking. A plain average lets one 5★ review beat fifty 4.8★ ones, so each entry is
 * ranked by a weighted average that blends in PRIOR_WEIGHT imaginary ratings of PRIOR_MEAN:
 * entries with few reviews are pulled toward the middle until they earn their place.
 */
export const PRIOR_WEIGHT = 3;
export const PRIOR_MEAN = 4;

export function weightedRating(ratingSum: number, ratingCount: number) {
  return (PRIOR_MEAN * PRIOR_WEIGHT + ratingSum) / (PRIOR_WEIGHT + ratingCount);
}

export interface RatingStats {
  ratingSum: number;
  ratingCount: number;
}

/** Highest weighted rating first; ties go to the one with more ratings. Entries need ≥ minCount ratings. */
export function rankByRating<T extends RatingStats>(items: T[], limit: number, minCount = 1): T[] {
  return items
    .filter((i) => i.ratingCount >= minCount)
    .map((i) => ({ i, score: weightedRating(i.ratingSum, i.ratingCount) }))
    .sort((a, b) => b.score - a.score || b.i.ratingCount - a.i.ratingCount)
    .slice(0, limit)
    .map(({ i }) => i);
}

/** Plain average for display (one decimal), or null with no ratings. */
export function averageRating({ ratingSum, ratingCount }: RatingStats) {
  return ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
}
