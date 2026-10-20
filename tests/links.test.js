// Shortcode resolution and link rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShortcodes, buildSources } from '../engine/lib/shortcodes.js';
import { wtInFirstSentence } from '../engine/lib/gates.js';

const linkPolicy = { sister_rel: 'follow', money_link_rel: 'nofollow', money_link_lang_note: { fr: ' (page en anglais)' } };
const page = (site, kind, slug, extra = {}) => ({ site, lang: 'fr', kind, url: kind === 'posts' ? `/blog/${slug}/` : `/${slug}/`, fm: { slug, title: `Titre ${slug}`, ...extra } });
const pages = [page('a.ma', 'pages', 'guide'), page('a.ma', 'posts', 'article'), page('b.ma', 'posts', 'autre')];
const ctx = {
  project: {
    network: { base_lang: 'fr' }, linkPolicy,
    sites: new Map([['a.ma', {}], ['b.ma', {}]]),
    registry: { fact_x: { source_urls: ['https://example.org/x', 'https://example.org/y'], verified_at: '2026-10-20' } },
    wtTargets: { 'bab-makka': { id: 'bab-makka', url: 'https://wikitours.ma/en/bab-makka', lang: 'en', label: 'Bab Makka' } },
  },
  pages,
  index: new Map(pages.map(p => [`${p.site}|${p.lang}|${p.fm.slug}`, p])),
};
const me = pages[1];

test('same-site, sister and wikitours links resolve to the right hrefs', () => {
  const r = resolveShortcodes('Voir [[link:guide|le guide]], [[link:blog|le blog]], [[site:b.ma/autre|un site frère]] et [[wt:bab-makka]].', me, ctx, new Map());
  assert.deepEqual(r.errors, []);
  assert.match(r.text, /<a href="\/guide\/">le guide<\/a>/);
  assert.match(r.text, /<a href="\/blog\/">le blog<\/a>/);
  assert.match(r.text, /<a href="https:\/\/b\.ma\/blog\/autre\/">un site frère<\/a>/);
  assert.match(r.text, /<a href="https:\/\/wikitours\.ma\/en\/bab-makka" rel="nofollow" class="wt-link">Bab Makka<\/a><span class="lang-note"> \(page en anglais\)<\/span>/);
  assert.deepEqual(r.links.map(l => l.kind), ['same', 'same', 'sister', 'wt']);
});

test('unresolved links are errors', () => {
  const r = resolveShortcodes('[[link:nope|x]] [[site:b.ma/nope|y]] [[site:c.ma/z|z]] [[wt:nope|w]] [[site:a.ma/guide|self]]', me, ctx, new Map());
  assert.equal(r.errors.length, 5);
  assert.match(r.errors.join('\n'), /unresolved same-site link/);
  assert.match(r.errors.join('\n'), /unknown sister site/);
  assert.match(r.errors.join('\n'), /unknown wikitours target/);
  assert.match(r.errors.join('\n'), /points to this site/);
});

test('fact markers become numbered citations; fact sources are appended after front-matter sources', () => {
  const p = { ...me, body: 'Un fait [[fact:fact_x]].', fm: { ...me.fm, sources: [{ title: 'T', publisher: 'P', url: 'https://example.org/a', accessed: '2026-10-01' }] } };
  const { sources, factNum } = buildSources(p, ctx.project);
  assert.deepEqual(sources.map(s => s.n), [1, 2, 3]);
  assert.equal(factNum.get('fact_x'), 2);
  const r = resolveShortcodes(p.body, p, ctx, factNum);
  assert.match(r.text, /<sup class="cite" data-fact="fact_x"><a href="#src-2">2<\/a><\/sup>/);
});

test('a wikitours.ma link in the first sentence is detected; later ones are fine', () => {
  const wt = '<a href="https://wikitours.ma/en" rel="nofollow" class="wt-link">Wiki Tours</a>';
  assert.equal(wtInFirstSentence(`<p>Chez ${wt} on trouve.</p>`), true);
  assert.equal(wtInFirstSentence(`<p>Première phrase. Puis ${wt}.</p>`), false);
  assert.equal(wtInFirstSentence(`<aside><!--nogate--><p>Label.</p><!--/nogate--></aside><p>Voir ${wt}.</p>`), true);
  assert.equal(wtInFirstSentence('<p>Aucun lien.</p>'), false);
});
