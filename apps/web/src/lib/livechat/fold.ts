/** Folds what people type differently (Arabic ي/ك, ZWNJ, spaces, case) so keywords match loosely. */
export const foldForMatch = (s: string) =>
  s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‎‏\s]+/g, "")
    .toLowerCase();

/** Does the text contain one of the keywords (folded)? */
export const hasKeyword = (text: string, keywords: string[]) => {
  const folded = foldForMatch(text);
  return !!folded && keywords.some((k) => foldForMatch(k) && folded.includes(foldForMatch(k)));
};
