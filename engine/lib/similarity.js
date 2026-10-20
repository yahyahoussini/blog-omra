// Near-duplicate detection: word-shingle Jaccard + 64-bit SimHash (ported from the tested prototype).
import { normalizeKeyword } from './normalize.js';

export const words = text => normalizeKeyword(text).split(' ').filter(Boolean);

export function shingles(text, w = 5) {
  const t = words(text); const out = new Set();
  for (let i = 0; i + w <= t.length; i++) out.add(t.slice(i, i + w).join(' '));
  return out;
}

export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0; const [s, l] = a.size < b.size ? [a, b] : [b, a];
  for (const x of s) if (l.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// FNV-1a 64-bit
export function fnv64(str) {
  let h = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(str, 'utf8')) { h ^= BigInt(byte); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h;
}

export function simhash(text, w = 3) {
  const v = new Array(64).fill(0);
  for (const sh of shingles(text, w)) {
    const h = fnv64(sh);
    for (let i = 0; i < 64; i++) v[i] += (h >> BigInt(i)) & 1n ? 1 : -1;
  }
  let out = 0n; for (let i = 0; i < 64; i++) if (v[i] > 0) out |= 1n << BigInt(i);
  return out;
}

export function hamming(a, b) { let x = a ^ b, c = 0; while (x) { x &= x - 1n; c++; } return c; }

// Pairs of documents that share at least one shingle, with their Jaccard score.
// Uses an inverted index so a large network does not need n² set comparisons.
// docs: [{ id, shingles:Set }] -> [{ a, b, score }]
export function similarPairs(docs, minScore = 0) {
  const index = new Map();
  docs.forEach((d, i) => { for (const s of d.shingles) { let l = index.get(s); if (!l) index.set(s, l = []); l.push(i); } });
  const inter = new Map();
  for (const list of index.values()) {
    if (list.length < 2) continue;
    for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
      const k = list[x] * 1e6 + list[y]; inter.set(k, (inter.get(k) || 0) + 1);
    }
  }
  const out = [];
  for (const [k, n] of inter) {
    const a = Math.floor(k / 1e6), b = k % 1e6;
    const score = n / (docs[a].shingles.size + docs[b].shingles.size - n);
    if (score >= minScore) out.push({ a: docs[a].id, b: docs[b].id, score });
  }
  return out;
}
