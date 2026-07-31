/**
 * Lightweight fuzzy text matching for catalogue descriptions.
 *
 *  - normalizeForMatch: lowercases and strips everything except letters/digits,
 *    so "Basmati Rice 25kg", "basmati rice 25 kg" and "Basmati-Rice 25KG" all
 *    collapse to the same string (treated as an exact/blocking duplicate).
 *  - similarity: Sørensen–Dice coefficient over character bigrams (0..1), which
 *    tolerates typos, word order and extra words — used to *warn* about probable
 *    (not exact) duplicates like "Premium Basmati Rice 25kg".
 */

export function normalizeForMatch(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

/** Dice coefficient of two already-normalized strings (0 = nothing in common, 1 = identical). */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 0 : 1;
  if (a.length < 2 || b.length < 2) return 0;

  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  let total = 0;
  for (const [bg, count] of A) {
    total += count;
    overlap += Math.min(count, B.get(bg) ?? 0);
  }
  for (const [, count] of B) total += count;
  return (2 * overlap) / total;
}

/** Fuzzy similarity of two raw descriptions (normalizes first). */
export function descriptionSimilarity(a: string, b: string): number {
  return diceCoefficient(normalizeForMatch(a), normalizeForMatch(b));
}
