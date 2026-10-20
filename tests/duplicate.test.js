import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shingles, jaccard, simhash, hamming, similarPairs } from '../engine/lib/similarity.js';
import { duplicateGate } from '../engine/lib/gates.js';
import { gateText, plainText } from '../engine/lib/markdown.js';

const t1 = 'Les documents pour la omra au Maroc : passeport valide, photos, carnet de vaccination et réservation.';
const t2 = 'Les documents pour la omra au Maroc : passeport valide, photos, carnet de vaccination et billet.';
const t3 = 'Comment choisir une agence de voyage agréée à Casablanca pour un pèlerinage en toute sécurité.';

test('shingle Jaccard and SimHash separate near-duplicates from distinct texts', () => {
  assert.ok(jaccard(shingles(t1), shingles(t2)) > 0.5);
  assert.equal(jaccard(shingles(t1), shingles(t3)), 0);
  assert.ok(hamming(simhash(t1), simhash(t2)) < hamming(simhash(t1), simhash(t3)));
});

test('the inverted-index pair search gives the same score as a direct Jaccard', () => {
  const docs = [t1, t2, t3].map((t, id) => ({ id, shingles: shingles(t) }));
  const pairs = similarPairs(docs, 0.1);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].score, jaccard(docs[0].shingles, docs[1].shingles));
});

test('duplicate gate: >= 0.5 blocks, 0.3-0.5 warns, distinct pages pass', () => {
  const long = Array.from({ length: 60 }, (_, i) => `mot${i}`).join(' ');
  const page = (plain, url) => ({ plain, absUrl: url, site: 's', file: url });
  const out = [];
  duplicateGate([page(long, 'a'), page(long + ' fin', 'b'), page(t3, 'c')], (level, gate, p, msg) => out.push({ level, gate, msg }));
  assert.ok(out.some(f => f.level === 'error' && /Jaccard/.test(f.msg)));
  assert.ok(out.some(f => f.level === 'error' && /SimHash/.test(f.msg)));
  const half = Array.from({ length: 40 }, (_, i) => `w${i}`);
  const a = half.join(' '), b = half.slice(0, 26).join(' ') + ' ' + Array.from({ length: 14 }, (_, i) => `z${i}`).join(' ');
  const out2 = [];
  duplicateGate([page(a, 'a'), page(b, 'b')], (level, gate, p, msg) => out2.push({ level, msg }));
  assert.ok(out2.some(f => f.level === 'warning' && /Jaccard 0\.[34]/.test(f.msg)), JSON.stringify(out2));
});

test('template boilerplate (labels, disclosure, CTA) is stripped before comparison', () => {
  const html = '<aside class="box"><!--nogate--><p class="box__label">À retenir</p><!--/nogate--><p>Texte propre <sup class="cite" data-fact="fact_x"><a href="#src-1">1</a></sup>.</p></aside>';
  assert.equal(gateText(html), 'Texte propre [[fact:fact_x]].');
  assert.equal(plainText(html), 'Texte propre.');
});
