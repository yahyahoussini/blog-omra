import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waLink, normalizeNumber, pageIdFromSlug, assignPageIds, refCode } from '../engine/lib/wa.js';
import { getModel } from '../engine/lib/model.js';

test('wa.me link: digits only, ref code first, url-encoded message', () => {
  const w = waLink({ number: '+212 6 00-00-00-00', site: 'omra-ramadan.ma', siteRef: 'OR', pageId: 123, topic: 'Omra Ramadan' });
  assert.equal(w.ref, 'OR-0123');
  assert.ok(w.href.startsWith('https://wa.me/212600000000?text='));
  const text = decodeURIComponent(w.href.split('text=')[1]);
  assert.ok(text.startsWith('[OR-0123] Bonjour Wiki Tours, je viens de omra-ramadan.ma. Omra Ramadan.'));
  assert.equal(text, w.message);
});

test('Arabic message and 00 prefix', () => {
  const w = waLink({ number: '00212600000000', site: 'guideomra.ma', siteRef: 'GO', pageId: 7, lang: 'ar', topic: 'سؤال' });
  assert.ok(decodeURIComponent(w.href).includes('[GO-0007] السلام عليكم'));
});

test('invalid numbers are rejected', () => {
  for (const n of [null, '', '0600000000', '+33 6 00 00 00 00', '2126000']) assert.throws(() => normalizeNumber(n), /212XXXXXXXXX/);
});

test('page ids are stable 4-digit values; collisions are probed; explicit page_id wins', () => {
  const id = pageIdFromSlug('dates-ramadan');
  assert.equal(id, pageIdFromSlug('dates-ramadan'));
  assert.ok(id >= 1 && id <= 9999);
  assert.equal(refCode('GO', 5), 'GO-0005');
  const pages = [
    { file: 'a.md', lang: 'fr', fm: { slug: 'x', date: '2026-01-01' } },
    { file: 'b.md', lang: 'fr', fm: { slug: 'x', date: '2026-02-01' } }, // same slug hash -> collision
    { file: 'c.md', lang: 'fr', fm: { slug: 'y', date: '2026-03-01', page_id: 42 } },
  ];
  assignPageIds(pages);
  assert.equal(pages[0].pageId, pageIdFromSlug('x'));
  assert.equal(pages[1].pageId, (pageIdFromSlug('x') % 9999) + 1);
  assert.equal(pages[2].pageId, 42);
});

test('the model id comes only from CLAUDE_MODEL', () => {
  assert.throws(() => getModel({}), /CLAUDE_MODEL is not set/);
  assert.equal(getModel({ CLAUDE_MODEL: ' some-model ' }), 'some-model');
});
