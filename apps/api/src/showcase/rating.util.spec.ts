import { averageRating, rankByRating, weightedRating } from './rating.util.js';

const e = (id: string, ratings: number[]) => ({ id, ratingSum: ratings.reduce((a, b) => a + b, 0), ratingCount: ratings.length });

describe('top-rated ranking', () => {
  it("doesn't let a single 5★ review beat a long record of 4.8★", () => {
    const one = e('one-review', [5]);
    const many = e('many', Array.from({ length: 50 }, (_, i) => (i % 5 === 0 ? 4 : 5))); // avg 4.8
    expect(rankByRating([one, many], 2).map((x) => x.id)).toEqual(['many', 'one-review']);
  });

  it('ranks by weighted rating, ties by number of ratings, and respects the limit', () => {
    const a = e('a', [5, 5, 5, 5]);
    const b = e('b', [4, 4]);
    const c = e('c', [5, 5, 5, 5]);
    const d = e('d', [3, 3, 3]);
    expect(rankByRating([d, b, a, c], 3).map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });

  it('skips entries without enough ratings', () => {
    expect(rankByRating([e('none', []), e('two', [4, 5])], 5, 2).map((x) => x.id)).toEqual(['two']);
  });

  it('weights toward the prior with few ratings', () => {
    expect(weightedRating(5, 1)).toBeCloseTo(4.25);
    expect(averageRating(e('x', [5, 4, 4]))).toBe(4.3);
    expect(averageRating(e('y', []))).toBeNull();
  });
});
