/**
 * Fuzzy text matching for catalogue descriptions — a weighted ensemble of
 * classic string-similarity algorithms:
 *
 *   Exact match ........ identical raw strings              -> 1.00 (short-circuit)
 *   Normalized match ... same after case/space/punct strip  -> 1.00 (short-circuit)
 *   Levenshtein ratio .. typing mistakes                    weight 0.30
 *   Jaro-Winkler ....... similar names / shared prefix      weight 0.30
 *   Token Sort Ratio ... different word order               weight 0.20
 *   Token Set Ratio .... extra / missing words              weight 0.20
 *
 * All measures return 0..1; the weighted sum is the fuzzy score.
 */

// Token ratios (order-independent) are weighted higher than the position-sensitive
// character measures so word-order swaps ("Rice Basmati" vs "Basmati Rice") still
// clear the threshold instead of being dragged down by Levenshtein/Jaro-Winkler.
const W_LEVENSHTEIN = 0.2;
const W_JARO_WINKLER = 0.2;
const W_TOKEN_SORT = 0.3;
const W_TOKEN_SET = 0.3;

/** Fuzzy score at/above which two descriptions are flagged as a probable
 *  (non-blocking) duplicate. Tunable. */
export const DESCRIPTION_SIMILARITY_THRESHOLD = 0.7;

/** Lowercase, strip everything but letters/digits — the "normalized match" key. */
export function normalizeForMatch(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Lowercase, collapse runs of non-alphanumerics to a single space, trim. */
function clean(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string | null | undefined): string[] {
  return clean(value).split(" ").filter(Boolean);
}

// ─── Levenshtein ────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur.slice();
  }
  return prev[n];
}

/** 1 - normalized edit distance (0..1). */
export function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Jaro–Winkler ───────────────────────────────────────────
function jaro(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 1 : 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aMatched = new Array(la).fill(false);
  const bMatched = new Array(lb).fill(false);

  let matches = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  let prefix = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * 0.1 * (1 - j);
}

// ─── Token ratios (fuzzywuzzy-style) ────────────────────────
/** Sort each string's words alphabetically, then compare — order-independent. */
export function tokenSortRatio(a: string, b: string): number {
  const sa = tokens(a).sort().join(" ");
  const sb = tokens(b).sort().join(" ");
  return levenshteinRatio(sa, sb);
}

/** Compare the shared words against each side's remainder — tolerant of extra words. */
export function tokenSetRatio(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  const intersection = [...A].filter((t) => B.has(t)).sort();
  const restA = [...A].filter((t) => !B.has(t)).sort();
  const restB = [...B].filter((t) => !A.has(t)).sort();

  const t0 = intersection.join(" ");
  const t1 = [...intersection, ...restA].join(" ");
  const t2 = [...intersection, ...restB].join(" ");

  return Math.max(
    levenshteinRatio(t0, t1),
    levenshteinRatio(t0, t2),
    levenshteinRatio(t1, t2),
  );
}

/**
 * Overall fuzzy similarity (0..1). Exact and normalized-exact matches short-circuit
 * to 1; otherwise the weighted sum of Levenshtein, Jaro-Winkler, token-sort and
 * token-set ratios.
 */
export function descriptionSimilarity(a: string, b: string): number {
  const rawA = (a ?? "").trim();
  const rawB = (b ?? "").trim();
  if (rawA && rawA === rawB) return 1; // exact
  const nA = normalizeForMatch(a);
  const nB = normalizeForMatch(b);
  if (nA && nA === nB) return 1; // normalized match (case/space/punctuation)

  const cA = clean(a);
  const cB = clean(b);
  return (
    W_LEVENSHTEIN * levenshteinRatio(cA, cB) +
    W_JARO_WINKLER * jaroWinkler(cA, cB) +
    W_TOKEN_SORT * tokenSortRatio(a, b) +
    W_TOKEN_SET * tokenSetRatio(a, b)
  );
}
