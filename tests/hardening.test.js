// Engine and automation hardening: raw HTML, link scope, feeds, season flip, per-site blocking, KB gate, rules.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNetwork } from '../engine/lib/build.js';
import { ldTypes, hrefs } from '../engine/lib/gates.js';
import { similarSetPairs, simhashBuckets, similarPairs, jaccard, hamming } from '../engine/lib/similarity.js';
import { requiredWordingGate } from '../engine/lib/facts-gate.js';
import { todayISO } from '../engine/lib/util.js';
import { briefChecks } from '../scripts/lib/draft-gate.js';
import { claimErrors } from '../scripts/lib/brief.js';
import { topicRuleProblems, factState } from '../scripts/lib/topics.js';
import { deadManFallback } from '../scripts/lib/killswitch.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini');
const TODAY = '2026-10-20';
const dirs = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });
async function variant(edit, today = TODAY) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-hard-'));
  dirs.push(root);
  fs.cpSync(FIXTURE, root, { recursive: true });
  edit(root);
  return buildNetwork({ root, outDir: path.join(root, 'dist'), today });
}
const append = (root, f, text) => { const p = path.join(root, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + text); };
const replace = (root, f, a, b) => { const p = path.join(root, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(a, b)); };
const msgs = r => r.errors.map(e => `${e.gate}: ${e.msg}`).join('\n');
const POST1 = 'content/alpha.test/fr/posts/premier-article.md';

test('raw HTML is escaped and blocked; single-quoted and titled links never slip through', async () => {
  const r = await variant(root => append(root, POST1, `\n<img src="x" onerror="alert(1)"> <script>alert(2)</script> <a href='https://wikitours.ma/en'>wt</a>\n`));
  assert.match(msgs(r), /html: raw HTML in Markdown is not allowed: « <img src="x" onerror="alert\(1\)"> »/);
  assert.match(msgs(r), /html: raw HTML in Markdown is not allowed: « <a href='https:\/\/wikitours\.ma\/en'> »/);
  const page = r.pages.find(p => p.file === POST1);
  assert.doesNotMatch(page.html, /<script>alert|<img src="x"/);
  assert.deepEqual(r.blocked, ['alpha.test']);
  assert.ok(!r.written.some(w => w.domain === 'alpha.test'));
  assert.deepEqual(hrefs(`<a href='/x'>a</a><a class="b" href="/y">b</a>`).map(h => h.href), ['/x', '/y']);
  // Generator scope: titled, reference-style and raw links are all outbound URLs.
  const body = 'Voir [a](https://evil.example/a "titre") et [r].\n\n[r]: https://evil.example/ref\n\n<a href=\'https://evil.example/raw\'>x</a> et [ok](https://ok.example/)';
  const out = briefChecks({ fm: { title: 't', description: 'd' }, body }, { facts: [], allowed_outbound_urls: ['https://ok.example/'], sister_links: [], wikitours_link: null }).map(p => p.msg).join('\n');
  for (const u of ['evil.example/a', 'evil.example/ref', 'evil.example/raw']) assert.match(out, new RegExp(u.replace('.', '\\.')));
  assert.doesNotMatch(out, /ok\.example/);
});

test('FAQ structured data carries no shortcode; link text falls back to a marker-free title', async () => {
  const r = await variant(root => {
    replace(root, POST1, 'a: "Elle dure 30 jours, selon le journal test [[fact:fact_test_window]]."', 'a: "Voir le [[link:guide-test|calendrier]] : elle dure 30 jours, selon le journal test [[fact:fact_test_window]]."');
    append(root, 'content/alpha.test/fr/pages/editeur.md', '\nVoir [[link:guide-test]].\n');
  });
  const page = r.pages.find(p => p.file === POST1);
  const faq = page.jsonld['@graph'].find(n => n['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Voir le calendrier : elle dure 30 jours, selon le journal test.');
  const editeur = r.pages.find(p => p.site === 'alpha.test' && p.fm.slug === 'editeur');
  assert.match(editeur.html, /<a href="\/guide-test\/">Calendrier test 2027 : les dates à connaître<\/a>/);
});

test('no rss link when every post of a site is noindex; the season flip is a warning on old pages, never a stop', async () => {
  // beta.test has one post: make it noindex. Its pages must not link to a feed that is not written.
  const r = await variant(root => replace(root, 'content/beta.test/fr/posts/article-beta.md', 'status: published', 'status: published\nnoindex: true'));
  assert.ok(!r.outputs.get('beta.test').has('rss.xml'));
  assert.doesNotMatch(r.pages.find(p => p.site === 'beta.test' && p.fm.type === 'home').html, /rss\.xml/);
  assert.doesNotMatch(msgs(r), /rss\.xml/);
  // A 2027 title (guide-test, dated 2026-10) after the 1 June 2027 flip: warning only.
  const later = await variant(() => {}, '2027-06-02');
  const stale = later.findings.filter(f => f.gate === 'stale-year');
  assert.ok(stale.length && stale.every(f => f.level === 'warning'), JSON.stringify(stale));
  // The same title on a page dated in the current season is an error (a new draft).
  const fresh = await variant(root => replace(root, 'content/alpha.test/fr/pages/guide-test.md', /updated: .*/, 'updated: 2027-06-02'), '2027-06-02');
  assert.ok(fresh.errors.some(e => e.gate === 'stale-year'));
});

test('a page slug equal to a language code is reserved, and two sources for one output file are an error', async () => {
  const r = await variant(root => {
    fs.writeFileSync(path.join(root, 'content/alpha.test/fr/pages/en.md'), '---\ntitle: "Une page au slug réservé pour le test"\ndescription: "Page de test dont le slug est un code de langue configuré, refusée par le moteur avant toute publication du site."\nslug: en\ntype: trust\nlang: fr\ndate: 2026-10-01\nstatus: published\n---\nTexte.\n');
    fs.mkdirSync(path.join(root, 'content/alpha.test/en/pages'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/alpha.test/en/pages/home.md'), '---\ntitle: "Alpha Test: the English home page of the fixture"\ndescription: "English home page of the Alpha fixture site, used only by the automated engine tests to check output collisions."\nslug: home\ntype: home\nlang: en\ndate: 2026-10-01\nstatus: published\n---\nWelcome.\n');
    const net = path.join(root, 'config/network.json');
    const n = JSON.parse(fs.readFileSync(net, 'utf8')); n.sites[0].languages = ['fr', 'en']; fs.writeFileSync(net, JSON.stringify(n));
  });
  assert.match(msgs(r), /slug "en" is reserved/);
  assert.match(msgs(r), /output file en\/index\.html is produced twice/);
});

test('religious text only through [[kb:id]] entries approved by a real person', async () => {
  const blocked = await variant(root => append(root, POST1, '\nLa talbiya se récite en entrant en ihram.\n'));
  assert.match(msgs(blocked), /religious-text: religious text or reference « talbiya »/);
  const ok = await variant(root => {
    fs.mkdirSync(path.join(root, 'data/facts/kb'), { recursive: true });
    fs.writeFileSync(path.join(root, 'data/facts/kb/kb_test.json'), JSON.stringify({ id: 'kb_test', kind: 'talbiya', lang: 'ar', text: 'نص تجريبي', translations: { fr: 'Texte de test' }, reference: 'Référence de test', source_url: 'https://example.org/kb', status: 'approved', approved_by: 'fixture-reviewer', approved_at: '2026-10-19' }));
    fs.writeFileSync(path.join(root, 'config/authors.json'), JSON.stringify([{ id: 'fixture-reviewer', name: 'Relecteur fictif de test', role: 'fixture' }]));
    append(root, POST1, '\nLe texte approuvé : [[kb:kb_test]].\n');
  });
  assert.deepEqual(ok.errors.map(e => e.msg), []);
  const page = ok.pages.find(p => p.file === POST1);
  assert.match(page.html, /<q class="kb__text" lang="ar" dir="rtl">نص تجريبي<\/q> <span class="kb__translation">\(Texte de test\)<\/span> <cite class="kb__ref">Référence de test<\/cite>/);
  const fake = await variant(root => {
    fs.mkdirSync(path.join(root, 'data/facts/kb'), { recursive: true });
    fs.writeFileSync(path.join(root, 'data/facts/kb/kb_x.json'), JSON.stringify({ id: 'kb_x', kind: 'dua', lang: 'ar', text: 'نص', reference: 'Réf', source_url: 'https://example.org/kb', status: 'approved', approved_by: 'nobody', approved_at: '2026-10-19' }));
  });
  assert.match(msgs(fake), /approved_by "nobody" is not a real person/);
});

test('links to a retired page become plain text with a warning, not a network-wide error', async () => {
  const r = await variant(root => replace(root, 'content/alpha.test/fr/posts/deuxieme-article.md', 'status: published', 'status: retired'));
  assert.ok(r.warnings.some(w => w.gate === 'links' && /retired page/.test(w.msg)));
  assert.doesNotMatch(msgs(r), /unresolved same-site link \[\[link:deuxieme-article/);
});

test('visa / health / Hajj rules need an official source; unlisted agency names block posts while legal_ok is null', async () => {
  const r = await variant(root => {
    const reg = path.join(root, 'data/facts/registry.json');
    fs.writeFileSync(reg, fs.readFileSync(reg, 'utf8').replace('"id": "fact_test_window", "topic": "umrah_season"', '"id": "fact_test_window", "topic": "visa"'));
    append(root, 'content/alpha.test/fr/posts/deuxieme-article.md', '\nUne autre agence Atlas Pelerinage propose aussi ce voyage.\n');
  });
  assert.match(msgs(r), /citations: visa rules need at least one official source/);
  assert.match(msgs(r), /entities: « Atlas Pelerinage » is not on the allowed entity list/);
});

test('JSON-LD types are read in arrays and nested nodes', () => {
  assert.deepEqual(ldTypes({ '@graph': [{ '@type': ['Organization', 'LocalBusiness'] }, { a: { '@type': 'TravelAgency' } }] }), ['Organization', 'LocalBusiness', 'TravelAgency']);
});

test('pair searches are exact: prefix filter, SimHash bands and the common-shingle cutoff', () => {
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);
  const sets = Array.from({ length: 80 }, () => new Set(Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => 't' + Math.floor(rnd() * 10))));
  const slow = [];
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) if (jaccard(sets[i], sets[j]) >= 0.6) slow.push(`${i}-${j}`);
  assert.deepEqual(similarSetPairs(sets, 0.6).map(p => `${p.a}-${p.b}`).sort(), slow.sort());
  const docs = sets.map((s, id) => ({ id, shingles: s }));
  const slowDocs = [];
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) { const s = jaccard(sets[i], sets[j]); if (s >= 0.3 && s > 0) slowDocs.push(`${i}-${j}`); }
  assert.deepEqual(similarPairs(docs, 0.3, 5).map(p => `${p.a}-${p.b}`).sort(), slowDocs.sort());
  const hs = [0n, 0b111n, 0b1111n, 1n << 40n, (1n << 40n) | 3n, 0xffffffffffffffffn];
  const cand = new Set(simhashBuckets(hs, 3).map(p => p.join('-')));
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (hamming(hs[i], hs[j]) <= 3) assert.ok(cand.has(`${i}-${j}`), `${i}-${j}`);
});

test('required wording follows the page language; facts without a translation wait for that language', () => {
  const registry = { fact_a: { id: 'fact_a', status: 'approved', required_wording: 'selon le journal', required_wording_en: 'according to the paper' } };
  assert.deepEqual(requiredWordingGate('It lasts 30 days, according to the paper [[fact:fact_a]].', registry, 'en'), []);
  const ar = requiredWordingGate('نص [[fact:fact_a]].', registry, 'ar');
  assert.equal(ar.length, 1); assert.equal(ar[0].wording, null);
  assert.match(factState(registry.fact_a, '2026-10-20', 0, 'ar'), /no ar required wording/);
  assert.equal(factState(registry.fact_a, '2026-10-20', 0, 'en'), 'ok');
});

test('topic rules: ritual topics wait for the KB, regulated topics need an official fact', () => {
  const project = { kb: {}, sites: new Map([['s', { meta: {} }]]), registry: { f_media: { topic: 'health', source_tier: 'media' }, f_off: { topic: 'visa', source_tier: 'official' } } };
  assert.match(topicRuleProblems({ site: 's', title: 'Le tawaf pas à pas', primary_keyword: 'tawaf omra', facts_needed: [] }, project).join(), /ritual topic/);
  assert.match(topicRuleProblems({ site: 's', title: 'Vaccin', primary_keyword: 'vaccin', facts_needed: ['f_media'] }, project).join(), /official-source fact/);
  assert.deepEqual(topicRuleProblems({ site: 's', title: 'Vaccin', primary_keyword: 'vaccin', facts_needed: ['f_media', 'f_off'] }, project), []);
});

test('claims verifier answers: unmapped claims and unreadable answers are errors', () => {
  const brief = { facts: [{ id: 'fact_a' }] };
  assert.deepEqual(claimErrors(JSON.stringify({ claims: [{ claim: 'x', fact_ids: ['fact_a'] }] }), brief), []);
  assert.match(claimErrors(JSON.stringify({ claims: [{ claim: 'Nusuk permet de réserver sans agence', fact_ids: [] }] }), brief)[0].msg, /Nusuk permet/);
  assert.match(claimErrors(JSON.stringify({ claims: [{ claim: 'y', fact_ids: ['fact_other'] }] }), brief)[0].msg, /not supported/);
  assert.equal(claimErrors('not json', brief)[0].gate, 'claims');
});

test('dead-man switch fails closed and dates follow Africa/Casablanca', () => {
  const cfg = { slow_multiplier: 0.5, unchecked_slow_after_days: 2 };
  const once = deadManFallback({ level: 'ok', multiplier: 1, reason: 'last weekly review closed 2026-10-15' }, cfg, 'HTTP 502');
  assert.equal(once.multiplier, 1); assert.equal(once.unchecked_days, 1);
  const twice = deadManFallback(once, cfg, 'HTTP 502');
  assert.equal(twice.multiplier, 0.5); assert.equal(twice.level, 'slow');
  assert.equal(deadManFallback({ level: 'paused', multiplier: 0 }, cfg, 'x').multiplier, 0);
  assert.equal(todayISO(new Date('2026-10-20T23:30:00Z')), '2026-10-21');
});

test('weekly link-target check reports any target that does not answer 200', async () => {
  const { checkLinkTargets } = await import('../scripts/lib/report.js');
  const fake = async url => ({ status: url.endsWith('/gone') ? 404 : 200 });
  const md = await checkLinkTargets([{ id: 'home', url: 'https://wikitours.ma/en' }, { id: 'old', url: 'https://wikitours.ma/en/gone' }], fake);
  assert.match(md, /OK home/);
  assert.match(md, /\*\*À CORRIGER\*\* old — https:\/\/wikitours\.ma\/en\/gone : 404/);
});
