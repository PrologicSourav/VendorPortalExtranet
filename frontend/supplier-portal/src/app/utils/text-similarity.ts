/**
 * Lightweight fuzzy text matching for catalogue descriptions.
 *
 *  - normalizeForMatch: lowercases and strips everything except letters/digits,
 *    so "Basmati Rice 25kg", "basmati rice 25 kg" and "Basmati-Rice 25KG" all
 *    collapse to the same string (treated as an exact/blocking duplicate).
 *  - descriptionSimilarity: max of a character-bigram Dice score (typo/spacing
 *    tolerant) and a word-set Dice score (word-order tolerant, so
 *    "Rice Basmati" ≈ "Basmati Rice"). Used to *warn* about probable
 *    (not exact) duplicates.
 */

export function normalizeForMatch(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokens(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    map.set(bg, (map.get(bg) ?? 0) + 1);
  }
  return map;
}

/** Dice coefficient of two already-normalized strings over character bigrams (0..1). */
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

/** Dice coefficient over the *sets of words* — order-independent. */
function wordSetSimilarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/**
 * Fuzzy similarity of two raw descriptions (0..1). Takes the stronger of a
 * character-bigram match (handles typos, spacing, unit glue like "25kg"/"25 kg")
 * and a word-set match (handles word order, e.g. "Rice Basmati" vs "Basmati Rice").
 */
export function descriptionSimilarity(a: string, b: string): number {
  return Math.max(
    diceCoefficient(normalizeForMatch(a), normalizeForMatch(b)),
    wordSetSimilarity(a, b),
  );
}
