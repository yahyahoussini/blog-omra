// Trilingual engine (DECISIONS D-H) on tests/fixtures/tri: routing per language, hreflang only for translation_key
// pairs, RTL, language switcher, localized byline / CTA, per-language gates, extra facts, per-site approved phrases,
// design-system assets, and the daily language rotation of the generator.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNetwork } from '../engine/lib/build.js';
import { factsGate } from '../engine/lib/facts-gate.js';
import { graphemes, formatDate, formatHijri } from '../engine/lib/i18n.js';
import { languagePlan } from '../scripts/lib/cadence.js';
import { selectTopics } from '../scripts/lib/topics.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'tri');
const TODAY = '2026-10-20';
const dirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-tri-')); dirs.push(d); return d; };
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

const out = tmp();
const res = await buildNetwork({ root: FIXTURE, outDir: out, today: TODAY });
const read = f => fs.readFileSync(path.join(out, f), 'utf8');
const has = f => fs.existsSync(path.join(out, f));
const alternates = html => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => `${m[1]} ${m[2]}`);

function variant(edit) {
  const root = tmp();
  fs.cpSync(FIXTURE, root, { recursive: true });
  edit(root);
  return buildNetwork({ root, outDir: path.join(root, 'dist'), today: TODAY });
}
const edit = (root, file, fn) => { const f = path.join(root, file); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };

test('the trilingual fixture builds with no gate errors', () => {
  assert.deepEqual(res.errors.map(e => `${e.gate} ${e.file || ''}: ${e.msg}`), []);
  assert.deepEqual(res.written.map(w => w.domain).sort(), ['other.test', 'tri.test']);
});

test('routing per language: homes, pages, posts, blog indexes and RSS under /, /ar/, /en/', () => {
  for (const f of ['index.html', 'calendrier/index.html', 'blog/index.html', 'blog/premier-billet/index.html', 'rss.xml',
    'ar/index.html', 'ar/taqwim/index.html', 'ar/blog/index.html', 'ar/blog/maqal-awwal/index.html', 'ar/rss.xml',
    'en/index.html', 'en/packing-list/index.html', 'en/blog/index.html', 'en/blog/first-post/index.html', 'en/rss.xml'])
    assert.ok(has(`tri.test/${f}`), f);
  // No mirroring: a page exists only where a file exists.
  for (const f of ['en/calendrier/index.html', 'en/taqwim/index.html', 'ar/packing-list/index.html', 'packing-list/index.html', 'ar/calendrier/index.html'])
    assert.ok(!has(`tri.test/${f}`), f);
  assert.match(read('tri.test/ar/rss.xml'), /<language>ar-MA<\/language>[\s\S]*ar\/blog\/maqal-awwal/);
  assert.match(read('tri.test/en/rss.xml'), /<language>en<\/language>/);
  assert.doesNotMatch(read('tri.test/rss.xml'), /maqal-awwal|first-post/);
});

test('html lang / dir and RTL: fr-MA ltr, ar-MA rtl, en ltr', () => {
  assert.match(read('tri.test/calendrier/index.html'), /<html lang="fr-MA" dir="ltr">/);
  assert.match(read('tri.test/ar/taqwim/index.html'), /<html lang="ar-MA" dir="rtl">/);
  assert.match(read('tri.test/ar/blog/index.html'), /<html lang="ar-MA" dir="rtl">/);
  assert.match(read('tri.test/en/packing-list/index.html'), /<html lang="en" dir="ltr">/);
  assert.match(read('tri.test/en/index.html'), /<meta property="og:locale" content="en_GB">/);
  // base.css uses logical properties for the emphasis border.
  assert.match(read('tri.test/index.html'), /border-inline-start:4px solid var\(--accent\)/);
});

test('hreflang only between translation_key pairs on the same site, reciprocal, x-default = French', () => {
  const fr = alternates(read('tri.test/calendrier/index.html'));
  const ar = alternates(read('tri.test/ar/taqwim/index.html'));
  const pair = ['fr-MA https://tri.test/calendrier/', 'ar-MA https://tri.test/ar/taqwim/', 'x-default https://tri.test/calendrier/'];
  assert.deepEqual(fr.sort(), [...pair].sort());
  assert.deepEqual(ar.sort(), [...pair].sort());
  // other.test reuses the key "calendar": never across domains.
  assert.ok(!fr.some(a => a.includes('other.test')));
  assert.deepEqual(alternates(read('other.test/calendrier-autre/index.html')), []);
  // English-only pages and posts have none; posts without a key have none.
  assert.deepEqual(alternates(read('tri.test/en/packing-list/index.html')), []);
  assert.deepEqual(alternates(read('tri.test/en/blog/first-post/index.html')), []);
  assert.deepEqual(alternates(read('tri.test/blog/premier-billet/index.html')), []);
  // Homes: always, the three languages + x-default.
  assert.deepEqual(alternates(read('tri.test/ar/index.html')).sort(),
    ['ar-MA https://tri.test/ar/', 'en https://tri.test/en/', 'fr-MA https://tri.test/', 'x-default https://tri.test/'].sort());
});

test('x-default points to the page itself when there is no French version', async () => {
  const r = await variant(root => {
    edit(root, 'content/tri.test/en/pages/packing-list.md', s => s.replace('status: "published"', 'status: "published"\ntranslation_key: "packing"'));
    fs.writeFileSync(path.join(root, 'content/tri.test/ar/pages/haqiba.md'), fs.readFileSync(path.join(root, 'content/tri.test/ar/pages/taqwim.md'), 'utf8')
      .replace('slug: "taqwim"', 'slug: "haqiba"').replace('"calendar"', '"packing"').replace('تقويم نهاية الموسم', 'حقيبة الاختبار').replace('"tri_calendar"', '"tri_packing"')
      .replace('"tri_dates"', '"tri_packing"').replace('التقويم التجريبي: تواريخ نهاية الموسم', 'حقيبة السفر التجريبية: ما يجب حمله')
      .replace('تقويم تجريبي مكتوب بالعربية', 'قائمة تجريبية مكتوبة بالعربية').replace('[[link:', '[[link:'));
    edit(root, 'config/sites/tri.test.json', s => s.replace('{ "label": "مقالات", "slug": "blog" }', '{ "label": "مقالات", "slug": "blog" }, { "label": "الحقيبة", "slug": "haqiba" }'));
  });
  const en = r.pages.find(p => p.fm.slug === 'packing-list');
  const ar = r.pages.find(p => p.fm.slug === 'haqiba');
  assert.deepEqual(en.alternates.map(a => `${a.hreflang} ${a.href}`).sort(), ['ar-MA https://tri.test/ar/haqiba/', 'en https://tri.test/en/packing-list/', 'x-default https://tri.test/en/packing-list/'].sort());
  assert.ok(ar.alternates.some(a => a.hreflang === 'en' && a.href === 'https://tri.test/en/packing-list/'), 'reciprocal');
});

test('sitemap: every language, xhtml:link alternates only on hreflang pairs', () => {
  const sm = read('tri.test/sitemap-pages.xml');
  assert.match(sm, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  const cal = sm.match(/<url><loc>https:\/\/tri\.test\/calendrier\/<\/loc>[\s\S]*?<\/url>/)[0];
  assert.match(cal, /<xhtml:link rel="alternate" hreflang="ar-MA" href="https:\/\/tri\.test\/ar\/taqwim\/"\/>/);
  assert.match(cal, /<xhtml:link rel="alternate" hreflang="x-default" href="https:\/\/tri\.test\/calendrier\/"\/>/);
  assert.match(sm, /<loc>https:\/\/tri\.test\/en\/packing-list\/<\/loc><lastmod>2026-10-03<\/lastmod><\/url>/);
  for (const u of ['https://tri.test/ar/blog/', 'https://tri.test/en/blog/', 'https://tri.test/ar/editeur/']) assert.ok(sm.includes(`<loc>${u}</loc>`), u);
  assert.match(read('tri.test/sitemap-posts.xml'), /\/ar\/blog\/maqal-awwal\/[\s\S]*\/en\/blog\/first-post\//);
});

test('language switcher: translation_key equivalent, otherwise the language home; lang attributes on links', () => {
  const fr = read('tri.test/calendrier/index.html');
  assert.match(fr, /<a class="lang-switch__link" href="\/ar\/taqwim\/" lang="ar-MA" hreflang="ar-MA" dir="rtl" title="العربية">العربية<\/a>/);
  assert.match(fr, /<a class="lang-switch__link" href="\/en\/" lang="en" hreflang="en" dir="ltr" title="English">EN<\/a>/);
  assert.match(fr, /href="\/calendrier\/" lang="fr-MA" hreflang="fr-MA" dir="ltr" aria-current="true"/);
  assert.match(read('tri.test/en/packing-list/index.html'), /href="\/ar\/" lang="ar-MA"[^>]*>العربية<\/a>/);
  assert.match(read('tri.test/ar/blog/index.html'), /href="\/blog\/" lang="fr-MA" hreflang="fr-MA" dir="ltr" title="Français">FR<\/a>|href="\/" lang="fr-MA"/);
});

test('per-language nav, labels, byline with Hijri date, WhatsApp prefill and ownership line', () => {
  const ar = read('tri.test/ar/blog/maqal-awwal/index.html');
  assert.match(ar, /<a class="site-nav__link" href="\/ar\/taqwim\/">التقويم<\/a>/);
  assert.match(ar, /نشر في <time datetime="2026-10-06">6 أكتوبر 2026<\/time> <span class="byline__hijri">\([^)]*1448[^)]*تاريخ هجري تقريبي\)<\/span>/);
  assert.match(ar, /كتب بمساعدة أداة ذكاء اصطناعي/);
  assert.match(ar, /<h2 class="box__title">ما لا نعرفه بعد<\/h2>/);
  assert.match(ar, /<h2 class="sources__title" id="sources-title">المصادر<\/h2>/);
  assert.match(ar, /aria-label="مسار التصفح"/);
  assert.match(ar, /text=%5BTR-\d{4}%5D%20%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85/); // « السلام عليكم Wiki Tours »
  assert.match(decodeURIComponent(ar.match(/wa\.me\/212600000000\?text=([^"]+)"/)[1]), /سؤال تجريبي\. عدد الأشخاص: __/);
  assert.match(ar, /نشر من طرف Wiki Tours International/);
  const en = read('tri.test/en/blog/first-post/index.html');
  assert.match(en, /Published <time datetime="2026-10-07">7 October 2026<\/time> <span class="byline__hijri">\([^)]*1448[^)]*approximate Hijri date\)<\/span>/);
  assert.match(decodeURIComponent(en.match(/wa\.me\/212600000000\?text=([^"]+)"/)[1]), /^\[TR-\d{4}\] Hello Wiki Tours, I am coming from tri\.test\. Test question\. Number of people: __$/);
  assert.match(en, /What we do not know yet/);
  assert.match(en, /Published by Wiki Tours International, travel agency, Casablanca/);
  assert.match(en, /<a class="site-nav__link" href="\/en\/packing-list\/">Packing list<\/a>/);
  assert.match(read('tri.test/blog/premier-billet/index.html'), /Publié le <time datetime="2026-10-05">5 octobre 2026<\/time> <span class="byline__hijri">\([^)]*date hégirienne approximative\)/);
});

test('Intl formatting: fr-MA / ar-MA (Western digits) / en-GB, Umm al-Qura Hijri; graphemes', () => {
  assert.equal(formatDate('2026-10-20', 'fr'), '20 octobre 2026');
  assert.equal(formatDate('2026-10-20', 'ar'), '20 أكتوبر 2026');
  assert.equal(formatDate('2026-10-20', 'en'), '20 October 2026');
  assert.match(formatHijri('2026-10-20', 'ar'), /1448/);
  assert.equal(graphemes('مُحَمَّد'), 4);
  assert.equal('مُحَمَّد'.length, 8);
});

test('design system: base.css + tokens inline, fonts self-hosted (Arabic only where needed), toggle only on dark sites', () => {
  const fr = read('tri.test/index.html');
  assert.match(fr, /<link rel="preload" href="\/assets\/fonts\/dm-sans-latin-400-normal\.woff2" as="font" type="font\/woff2" crossorigin>/);
  assert.match(read('tri.test/ar/index.html'), /<link rel="preload" href="\/assets\/fonts\/ibm-plex-sans-arabic-arabic-400-normal\.woff2"/);
  assert.match(fr, /--accent:#146C3C/);
  assert.match(fr, /--pattern:url\("data:image\/svg\+xml,/);
  assert.match(fr, /\.site--tri-test \.site-brand__name/); // themes/<domain>/style.css appended
  assert.doesNotMatch(fr, /fonts\.googleapis|fonts\.gstatic/);
  assert.ok(has('tri.test/assets/fonts/noto-kufi-arabic-arabic-700-normal.woff2'));
  assert.ok(has('tri.test/assets/fonts/dm-serif-display-latin-400-normal.woff2'));
  assert.doesNotMatch(fr, /theme-toggle\.js|<button class="theme-toggle"/);
  const dark = read('other.test/index.html');
  assert.match(dark, /<html lang="fr-MA" dir="ltr" data-theme="dark">/);
  assert.match(dark, /<button class="theme-toggle" type="button" aria-pressed="true" hidden>Thème sombre<\/button>/);
  assert.match(dark, /<script src="\/assets\/theme-toggle\.js" defer><\/script>/);
  assert.match(dark, /@media \(prefers-color-scheme:light\)\{:root\[data-theme=dark\]:not\(\[data-theme-lock\]\)/);
  assert.ok(has('other.test/assets/theme-toggle.js'));
  assert.match(read('tri.test/_headers'), /font-src 'self'/);
});

test('per-language banned claims block their page', async () => {
  const r = await variant(root => {
    edit(root, 'content/tri.test/fr/pages/contact.md', s => s + '\nUn accueil garanti par notre équipe.\n');
    edit(root, 'content/tri.test/ar/pages/contact.md', s => s + '\nرد مضمون من فريقنا.\n');
    edit(root, 'content/tri.test/en/pages/contact.md', s => s + '\nA guaranteed reply. Hurry, last seats for the call.\n');
  });
  const hit = lang => r.errors.filter(e => e.gate === 'banned-claim' && e.file === `content/tri.test/${lang}/pages/contact.md`).map(e => e.msg).join(' | ');
  assert.match(hit('fr'), /garanti/);
  assert.match(hit('ar'), /مضمون/);
  assert.match(hit('en'), /guaranteed/);
  assert.match(hit('en'), /fake urgency/);
});

test('English and Arabic rule words need a fact; Arabic-Indic digits are checked', () => {
  const reg = {};
  for (const s of ['The visa is mandatory.', 'A refund is possible before the deadline.', 'This service is free of charge.', 'Vaccines are required.'])
    assert.equal(factsGate(s, reg).errors[0]?.rule, 'rule-word-without-fact', s);
  assert.equal(factsGate('التأشيرة إلزامية.', reg).errors[0]?.rule, 'rule-word-without-fact');
  assert.equal(factsGate('المدة ٣٠ يوما.', reg).errors[0]?.rule, 'digits-without-fact');
  assert.deepEqual(factsGate('A calm and practical page.', reg).errors, []);
});

test('meta lengths count graphemes: Arabic vowel marks do not inflate a title', async () => {
  const r = await variant(root => edit(root, 'content/tri.test/ar/pages/contact.md', s => s.replace('الاتصال بالموقع التجريبي: صفحة الاتصال', 'اَلِاتِّصَالُ بِالْمَوْقِعِ التَّجْرِيبِيِّ: صَفْحَةُ الِاتِّصَالِ اَلْعَرَبِيَّةُ هُنَا')));
  const p = r.pages.find(x => x.file === 'content/tri.test/ar/pages/contact.md');
  assert.ok(p.fm.title.length > 70 && graphemes(p.fm.title) <= 70, `${p.fm.title.length} code units, ${graphemes(p.fm.title)} graphemes`);
  assert.ok(!r.errors.some(e => e.gate === 'meta' && e.file === p.file), r.errors.map(e => e.msg).join('\n'));
});

test('cannibalisation: a concept repeats across languages on its own site only; keywords are unique per language', async () => {
  // tri_window exists in fr, ar and en on tri.test: no error in the base build (checked above).
  const r = await variant(root => {
    fs.mkdirSync(path.join(root, 'content/other.test/fr/posts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/other.test/fr/posts/fenetre-autre.md'), fs.readFileSync(path.join(root, 'content/tri.test/fr/posts/premier-billet.md'), 'utf8')
      .replace('slug: "premier-billet"', 'slug: "fenetre-autre"').replace('Premier billet : la fenêtre de démonstration', 'Une autre fenêtre pour un autre site test')
      .replace('Billet français de démonstration', 'Billet du second site').replace('"tri_dates"', '"other_dates"').replace('[[link:calendrier|calendrier]]', '[[link:calendrier-autre|calendrier]]'));
    // Same keyword as the English post, but in French: allowed (unique per language).
    edit(root, 'content/tri.test/fr/pages/calendrier.md', s => s.replace('calendrier test fin de saison', 'demonstration window'));
  });
  const msgs = r.errors.filter(e => e.gate === 'cannibalisation').map(e => `${e.site}: ${e.msg}`);
  assert.ok(msgs.some(m => /other\.test: concept "tri_window" already served by .*owned by another site/.test(m)), msgs.join('\n'));
  assert.ok(msgs.some(m => /same primary keyword/.test(m)), 'fenetre demonstration repeats in French');
  assert.ok(!msgs.some(m => /demonstration window/.test(m) || (/same primary keyword/.test(m) && /calendrier/.test(m))), msgs.join('\n'));
});

test('duplicate checks compare pages of the same language only', async () => {
  const text = '\nThe same long paragraph is written twice for this test, word for word, so that the shingles of both pages are identical and the duplicate gate has something to find if it compares them across languages.\n';
  const r = await variant(root => {
    edit(root, 'content/tri.test/fr/pages/contact.md', s => s + text);
    edit(root, 'content/tri.test/en/pages/contact.md', s => s + text);
  });
  assert.ok(!r.findings.some(f => f.gate === 'duplicate' && /tri\.test\/(en\/)?contact/.test(f.msg) && f.site === 'tri.test'));
  const same = await variant(root => {
    edit(root, 'content/tri.test/en/pages/editeur.md', s => s + text);
    edit(root, 'content/tri.test/en/pages/contact.md', s => s + text);
  });
  assert.ok(same.findings.some(f => f.gate === 'duplicate' && f.file === 'content/tri.test/en/pages/editeur.md' || f.gate === 'duplicate' && f.file === 'content/tri.test/en/pages/contact.md'));
});

test('facts: data/facts/extra/*.json is merged; a duplicate id across files is a build error', async () => {
  assert.ok(res.project.registry.fact_tri_window, 'extra fact loaded');
  assert.equal(res.project.registryFiles.map(f => f.file).join(','), 'data/facts/registry.json,data/facts/extra/tri-extra.json');
  const r = await variant(root => fs.writeFileSync(path.join(root, 'data/facts/extra/dup.json'), fs.readFileSync(path.join(root, 'data/facts/registry.json'))));
  const e = r.errors.find(x => x.gate === 'registry');
  assert.match(e.msg, /duplicate fact id fact_tri_last_visa \(data\/facts\/registry\.json and data\/facts\/extra\/dup\.json\)/);
  assert.equal(e.site, null);
  assert.deepEqual(r.written, [], 'a registry error blocks every site');
});

test('approved phrases: per-site list merged with the network list, per language', async () => {
  // « 2M » is approved for tri.test English pages only; « Medias24 » (network, French) does not apply to English pages.
  const r = await variant(root => {
    edit(root, 'config/sites/tri.test.json', s => s.replace('"approved_phrases": { "en": ["2M"] },', ''));
    edit(root, 'content/other.test/fr/pages/contact.md', s => s + '\nNous suivons aussi Medias24.\n');
  });
  assert.ok(r.errors.some(e => e.gate === 'facts' && e.file === 'content/tri.test/en/pages/editeur.md' && /digits-without-fact/.test(e.msg)));
  assert.ok(!r.errors.some(e => e.file === 'content/other.test/fr/pages/contact.md'));
  const flat = await variant(root => edit(root, 'config/sites/tri.test.json', s => s.replace('"approved_phrases": { "en": ["2M"] }', '"approved_phrases": ["2M"]')));
  assert.deepEqual(flat.errors, []);
});

test('quota distribution across languages: rotation during the ramp, 1 fr + 1 ar + 1 en at the ceiling', () => {
  const cadence = { max_posts_per_language_per_day: 1 };
  const all = new Set(['fr', 'ar', 'en']);
  assert.deepEqual([1, 2, 3, 4].map(day => languagePlan({ cadence, day, perDay: 1, active: all })), [['fr'], ['ar'], ['en'], ['fr']]);
  const two = [1, 2, 3].map(day => languagePlan({ cadence, day, perDay: 2, active: all }));
  assert.deepEqual(two, [['fr', 'ar'], ['en', 'fr'], ['ar', 'en']]);
  const count = two.flat().reduce((m, l) => ({ ...m, [l]: (m[l] || 0) + 1 }), {});
  assert.deepEqual(count, { fr: 2, ar: 2, en: 2 }, 'equal share');
  assert.deepEqual(languagePlan({ cadence, day: 40, perDay: 3, active: all }).sort(), ['ar', 'en', 'fr']);
  assert.deepEqual(languagePlan({ cadence, day: 2, perDay: 3, active: new Set(['fr']) }), ['fr'], 'only languages with a home page');
  assert.deepEqual(languagePlan({ cadence, day: 2, perDay: 0, active: all }), []);
});

test('selectTopics follows the language plan and lends an unused slot to another language', () => {
  const project = res.project;
  const topic = (id, lang, extra = {}) => ({ id, lang, title: `Sujet ${id} pour le test des langues`, primary_keyword: `mot cle ${id}`, cluster: 'tri_dates', concept_id: `c_${id}`, type: 'checklist', facts_needed: ['fact_tri_last_visa'], status: 'queued', ...extra });
  const base = { site: 'tri.test', project, items: [], today: TODAY, langSlots: () => 1, activeLangs: new Set(['fr', 'ar', 'en']) };
  const topics = [topic('f1', 'fr'), topic('a1', 'ar'), topic('e1', 'en')];
  assert.deepEqual(selectTopics({ ...base, topics, quota: 1, langPlan: ['ar'] }).selected.map(t => t.id), ['a1']);
  assert.deepEqual(selectTopics({ ...base, topics, quota: 3, langPlan: ['fr', 'ar', 'en'] }).selected.map(t => t.id).sort(), ['a1', 'e1', 'f1']);
  const s = selectTopics({ ...base, topics: [topic('f1', 'fr'), topic('e1', 'en')], quota: 1, langPlan: ['ar'] });
  assert.equal(s.selected.length, 1, 'no Arabic topic: the slot goes to another language');
});

test('brief and system prompt: write natively in the topic language, never translate', async () => {
  const { systemPrompt, buildBrief } = await import('../scripts/lib/brief.js');
  const { loadContent } = await import('../engine/lib/content.js');
  const sys = systemPrompt(path.join(FIXTURE, '..', '..', '..'));
  assert.match(sys, /natively in the language/);
  assert.match(sys, /never translate, adapt or mirror another page/);
  assert.match(sys, /guaranteed/);
  const content = loadContent(res.project);
  const topic = { id: 'tr-ar-0001', lang: 'ar', title: 'موضوع تجريبي', primary_keyword: 'موضوع تجريبي', cluster: 'tri_dates', concept_id: 'tri_new', type: 'checklist', facts_needed: ['fact_tri_window', 'fact_tri_last_visa'], slug: 'mawdu' };
  const brief = buildBrief({ project: res.project, content, topic, site: 'tri.test', today: TODAY, status: 'published', charters: {} });
  assert.equal(brief.language.code, 'ar');
  assert.match(brief.language.write_as, /Modern Standard Arabic/);
  assert.equal(brief.facts.find(f => f.id === 'fact_tri_window').required_wording, 'حسب الجريدة التجريبية');
  assert.equal(brief.front_matter_fixed.cta.topic, 'سؤال تجريبي');
  assert.ok(brief.internal_links.every(l => ['taqwim', 'editeur', 'contact', 'maqal-awwal', 'accueil', 'blog'].includes(l.slug)), 'Arabic pages only');
  const en = buildBrief({ project: res.project, content, topic: { ...topic, lang: 'en', slug: 'topic' }, site: 'tri.test', today: TODAY, status: 'published', charters: {} });
  assert.deepEqual(en.approved_fixed_expressions, ['2M']);
});
