// Regressions for the trilingual verification round (2026-10-20): light override of dark-default themes, Arabic and
// English rule words, Arabic-Indic number grouping, registry i18n overlay, cannibalisation ownership, x-default,
// per-language site config and same-language trust pages, CTA reference punctuation, WebSite alternateName.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss, NEUTRAL } from '../engine/lib/theme.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseCss = fs.readFileSync(path.join(ROOT, 'themes/_base/base.css'), 'utf8');
const decls = body => Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+|color-scheme)\s*:\s*([^;}]+)/g)].map(m => [m[1], m[2].trim()]));

test('theme: the light override of a dark-default site resets every token the dark state sets', async () => {
  const baseDark = decls(baseCss.match(/:root\[data-theme=dark\]\{([^}]*)\}/)[1]);
  const themes = fs.readdirSync(path.join(ROOT, 'themes')).filter(d => fs.existsSync(path.join(ROOT, 'themes', d, 'theme.js')));
  const synthetic = { tokens: { default: 'dark', dark: { 'cover-bg': '#000000' } } };   // no light accent at all
  const all = [synthetic, ...await Promise.all(themes.map(async d => (await import(path.join(ROOT, 'themes', d, 'theme.js'))).default))];
  let darkSites = 0;
  for (const theme of all) {
    if (theme.tokens?.default !== 'dark') continue;
    darkSites++;
    const css = tokensCss(theme);
    const themeDark = decls(css.match(/^:root\[data-theme=dark\]\{([^}]*)\}/m)[1]);
    const light = decls(css.match(/@media \(prefers-color-scheme:light\)\{:root\[data-theme=dark\]:not\(\[data-theme-lock\]\)\{([^}]*)\}\}/)[1]);
    for (const k of new Set([...Object.keys(baseDark), ...Object.keys(themeDark)])) assert.ok(k in light, `${k} is not reset in the light override`);
    assert.equal(light['color-scheme'], 'light');
    for (const k of ['--ok-soft', '--warn-soft', '--danger-soft']) assert.equal(light[k], NEUTRAL.light[k.slice(2)]);
    assert.equal(light['--cover-bg'], 'initial');
  }
  assert.ok(darkSites >= 2);
});

test('theme: no theme stylesheet styles the dark state with [data-theme=dark] selectors', () => {
  for (const d of fs.readdirSync(path.join(ROOT, 'themes'))) {
    const f = path.join(ROOT, 'themes', d, 'style.css');
    if (fs.existsSync(f)) assert.doesNotMatch(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /data-theme/, f);
  }
});

// ---------- facts gate ----------
import { factsGate } from '../engine/lib/facts-gate.js';
const gateRules = (s, reg = {}) => factsGate(s, reg).errors.map(e => e.rule);

test('facts gate: Arabic obligation, vaccine, quota, deadline, refund, ban, condition and permit words need a fact', () => {
  for (const s of ['يجب أخذ لقاح الحمى الشوكية قبل السفر.', 'التطعيم ضد الحمى الشوكية شرط للدخول.', 'حصة المغرب من الحجاج محددة كل سنة.',
    'آخر أجل للتسجيل يقترب.', 'المبلغ غير قابل للاسترداد.', 'دخول مكة محظور بدون تصريح.', 'يشترط الحصول على تصريح نسك.',
    'وتكون الشروط واضحة.', 'لا يسمح بالدخول دون موعد.', 'التلقيح مطلوب.', 'هناك مهلة قصيرة.', 'الموعد النهائي قريب.'])
    assert.deepEqual(gateRules(s), ['rule-word-without-fact'], s);
  // mirrors of the French regressions
  assert.deepEqual(gateRules('Le vaccin contre la méningite est exigé.'), ['rule-word-without-fact']);
  // « من أجل » (= « pour ») is not a deadline
  assert.deepEqual(gateRules('زرنا مكة من أجل العمرة.'), []);
});

test('facts gate: English compulsory, obligatory, must, banned, not allowed and permit need a fact', () => {
  for (const s of ['The meningitis jab is compulsory.', 'This step is obligatory.', 'Pilgrims must hold a Nusuk permit.',
    'Entry is banned without a permit.', 'Children are not allowed in this area.', 'Photos are not permitted inside.', 'You must check in early.'])
    assert.deepEqual(gateRules(s), ['rule-word-without-fact'], s);
  assert.deepEqual(gateRules('The mustard at the hotel was good.'), []);
});

test('facts gate: Arabic thousands and decimal separators and space-grouped Arabic-Indic digits', () => {
  const reg = { f: { id: 'f', status: 'approved', values: ['63021', '3.5'] } };
  for (const s of ['٦٣٬٠٢١ درهما [[fact:f]].', '٦٣ ٠٢١ درهما [[fact:f]].', '٦٣٠٢١ درهما [[fact:f]].', '63 021 درهما [[fact:f]].', '٣٫٥ ٪ [[fact:f]].'])
    assert.deepEqual(gateRules(s, reg), [], s);
  assert.deepEqual(factsGate('٦٣٬٠٢٢ درهما [[fact:f]].', reg).errors.map(e => `${e.rule}:${e.value}`), ['number-not-in-fact:63022']);
});

// ---------- registry overlay ----------
import { applyI18nOverlay, loadProject } from '../engine/lib/config.js';
import { requiredWordingGate } from '../engine/lib/facts-gate.js';

test('registry overlay: AR/EN wordings merge onto registry facts; unknown ids and other fields are registry errors', () => {
  const files = () => [{ file: 'data/facts/registry.json', facts: [{ id: 'f1', status: 'approved', required_wording: 'estimation' }] }];
  const ok = applyI18nOverlay(files(), { f1: { required_wording_ar: 'تقدير', required_wording_en: 'estimate' } });
  assert.deepEqual(ok.overlayErrors, []);
  assert.equal(ok[0].facts[0].required_wording_ar, 'تقدير');
  const bad = applyI18nOverlay(files(), { nope: { claim_en: 'x' }, f1: { values: ['1'] } });
  assert.equal(bad.overlayErrors.length, 2);
  assert.match(bad.overlayErrors.join('\n'), /unknown fact id nope/);
  assert.match(bad.overlayErrors.join('\n'), /values not allowed/);
  assert.equal(bad[0].facts[0].values, undefined);
});

test('registry overlay: the real registry facts with a required wording can be cited in Arabic and English', async () => {
  const project = await loadProject(ROOT);
  assert.deepEqual(project.registryFiles.overlayErrors, []);
  const missing = project.registryList.filter(f => f.status === 'approved' && f.required_wording && !(f.required_wording_ar && f.required_wording_en));
  assert.deepEqual(missing.map(f => f.id), []);
  assert.deepEqual(requiredWordingGate('يوافق 1 رمضان 1448 يوم 8 فبراير 2027، تقدير، رهين برؤية الهلال [[fact:fact_ramadan_1448_start_umq]].', project.registry, 'ar'), []);
  assert.deepEqual(requiredWordingGate('1 Ramadan 1448 should fall on 8 February 2027, estimate, subject to moon sighting [[fact:fact_ramadan_1448_start_umq]].', project.registry, 'en'), []);
});

// ---------- English banned claims ----------
import { BANNED } from '../engine/lib/gates.js';
test('banned claims: « seats are limited » and « limited availability » are fake urgency; « financial guarantee » is allowed', () => {
  const hit = s => Object.values(BANNED).flat().some(([re]) => re.test(s));
  assert.ok(hit('Seats for the last ten nights are limited, so plan early.'));
  assert.ok(hit('Spots limited this season.'));
  assert.ok(hit('There is limited availability in March.'));
  const exceptions = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/approved-phrases.json'), 'utf8')).banned_claim_exceptions;
  const strip = s => exceptions.reduce((t, e) => t.split(e).join(' '), s);
  assert.ok(!hit(strip('Every licensed agency must hold a financial guarantee under law 11-16.')));
  assert.ok(!hit(strip('Agencies provide financial guarantees.')));
  assert.ok(hit(strip('Your visa is guaranteed.')));
});

// ---------- builds on the fixtures ----------
import os from 'node:os';
import { after } from 'node:test';
import { buildNetwork } from '../engine/lib/build.js';
const TRI = path.join(ROOT, 'tests/fixtures/tri');
const MINI = path.join(ROOT, 'tests/fixtures/mini');
const TODAY = '2026-10-20';
const tmpDirs = [];
after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
function variant(fixture, edit = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-i18nfix-'));
  tmpDirs.push(root);
  fs.cpSync(fixture, root, { recursive: true });
  edit(root);
  return buildNetwork({ root, outDir: path.join(root, 'dist'), today: TODAY });
}
const editFile = (root, file, fn) => { const f = path.join(root, file); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };

test('cannibalisation: the oldest page owns a concept, even when the newcomer is on a site listed earlier', async () => {
  // alpha.test is listed first in network.json; beta.test has served test_prices since 2026-10-03.
  const r = await variant(MINI, root => fs.writeFileSync(path.join(root, 'content/alpha.test/fr/pages/moyenne-alpha.md'), `---
title: "Alpha : une autre page sur la moyenne publiée"
description: "Une nouvelle page du site Alpha qui reprend l'intention de la page de données du site Beta, publiée plus tard que celle-ci."
slug: moyenne-alpha
type: data
tier: B
lang: fr
date: 2026-10-10
status: published
primary_keyword: moyenne publiee alpha
cluster: test_dates
concept_id: test_prices
---
Texte de test sans chiffre.
`));
  const cannibal = r.errors.filter(e => e.gate === 'cannibalisation' && /test_prices/.test(e.msg));
  assert.equal(cannibal.length, 1);
  assert.equal(cannibal[0].site, 'alpha.test');
  assert.match(cannibal[0].file, /moyenne-alpha\.md$/);
  assert.match(cannibal[0].msg, /owned by another site: beta\.test, since 2026-10-03/);
  assert.ok(!r.blocked.includes('beta.test'), 'the owner keeps building');
  assert.ok(r.written.some(w => w.domain === 'beta.test'));
});

test('hreflang: a pair with no French page prints the same x-default on every member and in the sitemap', async () => {
  const r = await variant(TRI, root => {
    editFile(root, 'content/tri.test/fr/pages/calendrier.md', s => s.replace('translation_key: "calendar"\n', ''));
    editFile(root, 'content/tri.test/en/pages/packing-list.md', s => s.replace('concept_id: "tri_packing"\n', 'concept_id: "tri_packing"\ntranslation_key: "calendar"\n'));
  });
  const xd = html => [...html.matchAll(/hreflang="x-default" href="([^"]+)"/g)].map(m => m[1]);
  const ar = r.pages.find(p => p.site === 'tri.test' && p.fm.slug === 'taqwim');
  const en = r.pages.find(p => p.site === 'tri.test' && p.fm.slug === 'packing-list');
  assert.deepEqual(xd(ar.html), ['https://tri.test/en/packing-list/']);
  assert.deepEqual(xd(en.html), ['https://tri.test/en/packing-list/']);
  const sitemap = r.outputs.get('tri.test').get('sitemap-pages.xml');
  const xdSitemap = [...sitemap.matchAll(/hreflang="x-default" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(xdSitemap.filter(u => u.includes('packing-list')).length === 2 && !xdSitemap.includes('https://tri.test/ar/taqwim/'));
});

test('localized chrome: CTA reference punctuation per language and WebSite alternateName in the page language', async () => {
  const r = await variant(TRI);
  const page = (lang, type) => r.pages.find(p => p.site === 'tri.test' && p.lang === lang && p.fm.type === type);
  assert.match(page('fr', 'home').html, /<p class="cta__ref">Référence : <span>/);
  assert.match(page('en', 'home').html, /<p class="cta__ref">Reference: <span>/);
  assert.match(page('ar', 'home').html, /<p class="cta__ref">المرجع: <span>/);
  const alt = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n => n['@type'] === 'WebSite').alternateName;
  assert.equal(alt(page('fr', 'home').html), 'Tri Test par Wiki Tours');
  assert.equal(alt(page('ar', 'home').html), 'Tri Test من Wiki Tours');
  assert.equal(alt(page('en', 'home').html), 'Tri Test by Wiki Tours');
});

test('per-language site config and trust pages: missing footer nav is an error, fallback links do not count', async () => {
  const r = await variant(TRI, root => {
    fs.rmSync(path.join(root, 'content/tri.test/ar/pages/contact.md'));
    editFile(root, 'config/sites/tri.test.json', s => { const c = JSON.parse(s); delete c.footer_nav.ar; delete c.tagline.ar; delete c.blog.ar; return JSON.stringify(c); });
  });
  const msgs = gate => r.findings.filter(f => f.gate === gate && f.site === 'tri.test').map(f => `${f.level} ${f.msg}`).join('\n');
  assert.match(msgs('site-config'), /error ar: footer_nav has no ar entries/);
  assert.match(msgs('site-config'), /warning ar: no tagline/);
  assert.match(msgs('site-config'), /warning ar: no blog description/);
  assert.match(msgs('site-config'), /warning ar: no « contact » page in this language/);
  assert.doesNotMatch(msgs('site-config'), /(fr|en): /);
  // the Arabic post's [[link:contact]] now reaches the French contact page: it renders but does not count
  const post = r.findings.filter(f => f.gate === 'links' && /maqal-awwal/.test(f.file || ''));
  assert.ok(post.some(f => f.level === 'error' && /2 same-site links.*1 link\(s\) to pages in another language do not count/.test(f.msg)), JSON.stringify(post));
});
