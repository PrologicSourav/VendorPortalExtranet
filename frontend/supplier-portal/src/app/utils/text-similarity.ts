/**
 * Fuzzy text matching for catalogue descriptions — a weighted ensemble of
 * classic string-similarity algorithms:
 *
 *   Exact match ........ identical raw strings              -> 1.00 (short-circuit)
 *   Normalized match ... same after case/space/punct strip  -> 1.00 (short-circuit)
 *   Levenshtein ratio .. typing mistakes                    weight 0.30
 *   Jaro-Winkler ....... similar names / shared prefix      weight 0.30
 *   Token Sort Ratio ... different word order               weight 0.20
 *   Token Set Ratio .... extra / missing words (fuzzy-word) weight 0.20
 *
 * All measures return 0..1. The final score is the MAX of the weighted ensemble
 * and the two token ratios, so a single strong signal (word-order swap or a
 * subset of words, even with a typo inside one word) can trigger on its own
 * instead of being diluted by the sum.
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

/** Two individual words count as "the same word" at/above this similarity, so a
 *  mistyped token ("rce" vs "rice") still pairs up in the token-set intersection. */
const TOKEN_MATCH_THRESHOLD = 0.8;

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

/** Per-word similarity used to decide whether two tokens are "the same word". */
function tokenSimilarity(x: string, y: string): number {
  return Math.max(levenshteinRatio(x, y), jaroWinkler(x, y));
}

/**
 * Compare the shared words against each side's remainder — tolerant of extra
 * words AND of typos *within* a word. Instead of an exact set intersection, each
 * word of A is greedily paired with its best-matching still-unpaired word of B
 * when they are similar enough (>= TOKEN_MATCH_THRESHOLD), so "rce" pairs with
 * "rice". Paired words form the shared set; the rest are each side's remainder.
 */
export function tokenSetRatio(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  const usedB = new Array(B.length).fill(false);
  const shared: string[] = [];
  const restA: string[] = [];

  for (const ta of A) {
    let bestJ = -1;
    let bestScore = 0;
    for (let j = 0; j < B.length; j++) {
      if (usedB[j]) continue;
      const s = tokenSimilarity(ta, B[j]);
      if (s >= TOKEN_MATCH_THRESHOLD && s > bestScore) {
        bestScore = s;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      usedB[bestJ] = true;
      shared.push(B[bestJ]);
    } else {
      restA.push(ta);
    }
  }
  const restB = B.filter((_, j) => !usedB[j]);

  const intersection = shared.sort();
  const t0 = intersection.join(" ");
  const t1 = [...intersection, ...restA.sort()].join(" ");
  const t2 = [...intersection, ...restB.sort()].join(" ");

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
  const tsort = tokenSortRatio(a, b);
  const tset = tokenSetRatio(a, b);
  const ensemble =
    W_LEVENSHTEIN * levenshteinRatio(cA, cB) +
    W_JARO_WINKLER * jaroWinkler(cA, cB) +
    W_TOKEN_SORT * tsort +
    W_TOKEN_SET * tset;

  // A weighted sum dilutes strong single signals: "rice basmati" vs
  // "Basmati Rice 25kg" scores 1.0 on token-set (same words, one extra) but the
  // sum drags it under threshold. Let word-order (token-sort) or extra/missing
  // words (token-set) trigger on their own by taking the max.
  return Math.max(ensemble, tsort, tset);
}
