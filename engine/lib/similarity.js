// Near-duplicate detection: word-shingle Jaccard + 64-bit SimHash (ported from the tested prototype).
import { normalizeKeyword } from './normalize.js';

export const words = text => normalizeKeyword(text).split(' ').filter(Boolean);

export function shingles(text, w = 5) { return shinglesOf(words(text), w); }

// Word w-shingles of a token list, as 53-bit numeric hashes (smaller and faster than strings on big networks).
export function shinglesOf(t, w = 5) {
  const out = new Set();
  for (let i = 0; i + w <= t.length; i++) { const [a, b] = fnv32x2(t.slice(i, i + w).join(' ')); out.add(a * 2097152 + (b & 0x1fffff)); }
  return out;
}

// Word count, 5-shingles and SimHash of a text, cached by text: the generator gates the whole network once per
// draft attempt, and unchanged pages must not be re-tokenised every time.
const FEATURES = new Map();
export function docFeatures(text) {
  let f = FEATURES.get(text);
  if (!f) {
    const t = words(text);
    f = { words: t.length, shingles5: shinglesOf(t, 5), simhash: simhash(t) };
    if (FEATURES.size > 50000) FEATURES.clear();
    FEATURES.set(text, f);
  }
  return f;
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a];
  for (const x of s) if (l.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Two independent 32-bit FNV-1a hashes (plain numbers: BigInt per shingle was the slowest part of a large build).
function fnv32x2(str) {
  let a = 0x811c9dc5, b = 0x050c5d1f;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193) >>> 0;
    b = (b ^ (b >>> 15)) >>> 0;
  }
  return [a, b];
}

// 64-bit SimHash of word 3-shingles (from a text, or from its words() tokens).
export function simhash(textOrTokens, w = 3) {
  const t = Array.isArray(textOrTokens) ? textOrTokens : words(textOrTokens);
  const v = new Array(64).fill(0);
  const seen = new Set();
  for (let i = 0; i + w <= t.length; i++) {
    const sh = t.slice(i, i + w).join(' ');
    if (seen.has(sh)) continue;
    seen.add(sh);
    const [lo, hi] = fnv32x2(sh);
    for (let i = 0; i < 32; i++) { v[i] += (lo >>> i) & 1 ? 1 : -1; v[32 + i] += (hi >>> i) & 1 ? 1 : -1; }
  }
  let lo = 0, hi = 0;
  for (let i = 0; i < 32; i++) { if (v[i] > 0) lo |= 1 << i; if (v[32 + i] > 0) hi |= 1 << i; }
  return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0);
}

export function hamming(a, b) { let x = a ^ b, c = 0; while (x) { x &= x - 1n; c++; } return c; }

// Pairs of documents with shingle Jaccard >= minScore. An inverted index over the shingles that few documents share
// finds the candidates (shingles found in more than maxDf documents, such as stock phrases, would make it n²);
// each candidate's score is then exact. A document made mostly of such common shingles is compared with every other.
// docs: [{ id, shingles:Set }] -> [{ a, b, score }]
export function similarPairs(docs, minScore = 0, maxDf = 50) {
  const index = new Map();
  docs.forEach((d, i) => { for (const s of d.shingles) { let l = index.get(s); if (!l) index.set(s, l = []); l.push(i); } });
  const common = docs.map(d => { let c = 0; for (const s of d.shingles) if (index.get(s).length > maxDf) c++; return c; });
  const shared = new Map();
  for (const list of index.values()) {
    if (list.length < 2 || list.length > maxDf) continue;
    for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
      const k = list[x] * 1e6 + list[y]; shared.set(k, (shared.get(k) || 0) + 1);
    }
  }
  docs.forEach((d, i) => {
    if (!d.shingles.size || common[i] / d.shingles.size < minScore) return;
    for (let j = 0; j < docs.length; j++) if (j !== i) { const k = Math.min(i, j) * 1e6 + Math.max(i, j); if (!shared.has(k)) shared.set(k, 0); }
  });
  const out = [];
  for (const [k, n] of shared) {
    const a = Math.floor(k / 1e6), b = k % 1e6;
    const A = docs[a].shingles, B = docs[b].shingles;
    const most = n + Math.min(common[a], common[b]); // upper bound of the true intersection
    if (most / (A.size + B.size - most) < minScore) continue;
    const score = jaccard(A, B);
    if (score >= minScore && score > 0) out.push({ a: docs[a].id, b: docs[b].id, score });
  }
  return out.sort((x, y) => x.b - y.b || x.a - y.a);
}

// Pairs of sets with Jaccard >= minScore, via prefix filtering: with tokens sorted rarest first, two sets that
// reach the threshold always share a token among their first |x| - ceil(t·|x|) + 1 tokens. Near-linear on titles.
// sets: [Set<string>] -> [{ a, b, score }] with a < b (indexes into sets).
export function similarSetPairs(sets, minScore) {
  const freq = new Map();
  for (const s of sets) for (const t of s) freq.set(t, (freq.get(t) || 0) + 1);
  const order = (x, y) => freq.get(x) - freq.get(y) || (x < y ? -1 : x > y ? 1 : 0);
  const index = new Map();
  const out = [];
  sets.forEach((set, b) => {
    if (!set.size) return;
    const toks = [...set].sort(order);
    const prefix = toks.slice(0, toks.length - Math.ceil(minScore * toks.length) + 1);
    const seen = new Set();
    for (const t of prefix) for (const a of index.get(t) || []) {
      if (seen.has(a)) continue;
      seen.add(a);
      const score = jaccard(sets[a], set);
      if (score >= minScore) out.push({ a, b, score });
    }
    for (const t of prefix) { let l = index.get(t); if (!l) index.set(t, l = []); l.push(b); }
  });
  return out.sort((x, y) => x.b - y.b || x.a - y.a);
}

// Candidate pairs of 64-bit hashes that may be within maxDist bits: split into maxDist + 1 bands, and two hashes
// within maxDist bits share at least one identical band (pigeonhole). Returns [[x, y]] with x < y, each pair once.
export function simhashBuckets(hashes, maxDist) {
  const bands = maxDist + 1, width = Math.ceil(64 / bands);
  const buckets = new Map(), pairs = new Map();
  hashes.forEach((h, i) => {
    for (let b = 0; b < bands; b++) {
      const key = `${b}:${(h >> BigInt(b * width)) & ((1n << BigInt(width)) - 1n)}`;
      const list = buckets.get(key) || [];
      for (const j of list) pairs.set(j * 1e6 + i, [j, i]);
      list.push(i); buckets.set(key, list);
    }
  });
  return [...pairs.values()].sort((p, q) => p[1] - q[1] || p[0] - q[0]);
}
