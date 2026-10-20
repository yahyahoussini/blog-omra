// Full build smoke test on the two-site fixture (tests/fixtures/mini), plus failing variants.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNetwork } from '../engine/lib/build.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mini');
const TODAY = '2026-10-20';
const dirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-engine-')); dirs.push(d); return d; };
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

const out = tmp();
const res = await buildNetwork({ root: FIXTURE, outDir: out, today: TODAY });
const read = f => fs.readFileSync(path.join(out, f), 'utf8');
const jsonld = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('the fixture builds with no gate errors', () => {
  assert.deepEqual(res.errors.map(e => `${e.gate}: ${e.msg}`), []);
  assert.deepEqual(res.written.map(w => w.domain).sort(), ['alpha.test', 'beta.test']);
});

test('every expected file is written', () => {
  for (const f of ['index.html', 'guide-test/index.html', 'blog/index.html', 'blog/page/2/index.html', 'blog/premier-article/index.html',
    '404.html', 'sitemap-index.xml', 'sitemap-pages.xml', 'sitemap-posts.xml', 'rss.xml', 'robots.txt', '_headers', '_redirects',
    'alpha-test-key-123.txt', 'favicon.svg', 'editeur/index.html', 'contact/index.html'])
    assert.ok(fs.existsSync(path.join(out, 'alpha.test', f)), f);
  assert.ok(fs.existsSync(path.join(out, '_reports', 'gates.json')));
  assert.equal(read('alpha.test/alpha-test-key-123.txt'), 'alpha-test-key-123');
  assert.match(fs.readdirSync(path.join(out, 'beta.test')).join(' '), /\b[0-9a-f]{32}\.txt\b/); // derived IndexNow key
});

test('drafts, requires_legal pages and future posts are excluded', () => {
  const reasons = Object.fromEntries(res.excluded.map(x => [path.basename(x.file), x.reason]));
  assert.match(reasons['brouillon.md'], /draft/);
  assert.match(reasons['page-legale.md'], /legal_ok/);
  assert.match(reasons['futur.md'], /scheduled/);
  assert.ok(!fs.existsSync(path.join(out, 'alpha.test', 'page-legale')));
});

test('post page: lang, canonical, title, citation, sources, AI line, WhatsApp CTA', () => {
  const html = read('alpha.test/blog/premier-article/index.html');
  assert.match(html, /<html lang="fr-MA" dir="ltr">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/alpha\.test\/blog\/premier-article\/">/);
  assert.match(html, /<title>Premier article : la fenêtre d&#39;utilisation expliquée<\/title>/);
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<sup class="cite" data-fact="fact_test_window"><a href="#src-1">1<\/a><\/sup>/);
  assert.match(html, /<li id="src-1" class="sources__item"><a href="https:\/\/example\.org\/news\/window">/);
  assert.match(html, /Rédigé avec l&#39;aide d&#39;un outil d&#39;IA à partir de notre registre de faits\. Sources consultées le 19 octobre 2026\./);
  assert.match(html, /href="https:\/\/wa\.me\/212600000000\?text=%5BAL-\d{4}%5D%20Bonjour%20Wiki%20Tours/);
  assert.match(html, /rel="nofollow noopener"/);
  assert.match(html, /<a href="https:\/\/beta\.test\/blog\/article-beta\/">/); // sister link, followed
  assert.match(html, /Publié par Wiki Tours International, agence de voyages, Casablanca/);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.doesNotMatch(html, /Relu par/); // no review claimed
});

test('JSON-LD: Organization publisher, BlogPosting with Organization author, FAQPage only with faq', () => {
  const g = jsonld(read('alpha.test/blog/premier-article/index.html'))['@graph'];
  const types = g.map(x => x['@type']);
  assert.deepEqual(types, ['Organization', 'BreadcrumbList', 'BlogPosting', 'FAQPage']);
  assert.equal(g[0]['@id'], 'https://wikitours.ma/#org');
  assert.deepEqual(g[2].author, { '@id': 'https://wikitours.ma/#org' });
  const g2 = jsonld(read('alpha.test/blog/deuxieme-article/index.html'))['@graph'].map(x => x['@type']);
  assert.ok(!g2.includes('FAQPage'));
  const home = jsonld(read('alpha.test/index.html'))['@graph'].map(x => x['@type']);
  assert.ok(home.includes('WebSite'));
  const data = jsonld(read('beta.test/observatoire-test/index.html'))['@graph'].map(x => x['@type']);
  assert.ok(data.includes('Dataset') && data.includes('Article'));
  for (const f of ['alpha.test/index.html', 'beta.test/index.html']) assert.doesNotMatch(read(f), /LocalBusiness|TravelAgency/);
});

test('disclosure box and nofollow wikitours link with language note', () => {
  const html = read('alpha.test/blog/deuxieme-article/index.html');
  const box = html.indexOf('box--disclosure'), mention = html.indexOf('class="wt-link"');
  assert.ok(box > 0 && box < mention, 'disclosure sits above the first mention');
  assert.match(html, /href="https:\/\/wikitours\.ma\/en\/bab-makka" rel="nofollow" class="wt-link">Bab Makka<\/a><span class="lang-note"> \(page en anglais\)<\/span>/);
  const cta = read('alpha.test/blog/troisieme-article/index.html');
  assert.match(cta, /class="cta__wt">Pour aller plus loin : <a href="https:\/\/wikitours\.ma\/en" rel="nofollow"/);
  assert.match(cta, /Généré à partir de notre registre de faits\./); // tier B line
});

test('pillar: answer / retenir / unknown boxes, cluster list, title marker stripped', () => {
  const html = read('alpha.test/guide-test/index.html');
  for (const c of ['box--answer', 'box--retenir', 'box--unknown', 'cluster-list', 'table-wrap']) assert.ok(html.includes(c), c);
  assert.match(html, /<h1 class="article__title">Calendrier test 2027 : les dates à connaître<\/h1>/);
  assert.doesNotMatch(html, /\[\[fact:/);
  assert.match(html, /Sources consultées entre le 18 octobre 2026 et le 20 octobre 2026\./);
});

test('beta (no WhatsApp number): CTA falls back to /contact/ with a warning', () => {
  const html = read('beta.test/blog/article-beta/index.html');
  assert.match(html, /<a class="cta__button" href="\/contact\/">/);
  assert.ok(res.warnings.some(w => w.gate === 'whatsapp' && w.site === 'beta.test'));
  assert.match(read('beta.test/index.html'), /<header class="site-header site-header--centered">/);
});

test('site files: robots, sitemap, rss, headers, redirects', () => {
  const robots = read('alpha.test/robots.txt');
  assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*Allow: \/\nDisallow: \/go\//);
  assert.match(robots, /User-agent: ClaudeBot\nDisallow: \//);
  assert.match(robots, /Sitemap: https:\/\/alpha\.test\/sitemap-index\.xml/);
  assert.match(read('alpha.test/sitemap-index.xml'), /sitemap-posts\.xml/);
  const pagesMap = read('alpha.test/sitemap-pages.xml');
  assert.match(pagesMap, /<loc>https:\/\/alpha\.test\/guide-test\/<\/loc><lastmod>2026-10-10<\/lastmod>/);
  assert.match(pagesMap, /<loc>https:\/\/alpha\.test\/<\/loc><lastmod>2026-10-07<\/lastmod>/); // home: latest post
  assert.doesNotMatch(pagesMap, /404/);
  const rss = read('alpha.test/rss.xml');
  assert.equal((rss.match(/<item>/g) || []).length, 3);
  assert.doesNotMatch(rss, /futur/);
  assert.match(read('alpha.test/_headers'), /Content-Security-Policy:/);
  assert.match(read('alpha.test/_headers'), /https:\/\/alpha-test\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
  assert.equal(read('alpha.test/_redirects').trim(), '/ancien-guide/ /guide-test/ 301');
  assert.match(read('alpha.test/blog/index.html'), /rel="next" href="\/blog\/page\/2\/"/);
});

// ---------- failing variants ----------
function variant(edit) {
  const root = tmp();
  fs.cpSync(FIXTURE, root, { recursive: true });
  edit(root);
  return buildNetwork({ root, outDir: path.join(root, 'dist'), today: TODAY });
}
const post = (fm, body) => `---\n${Object.entries({ type: 'explainer', tier: 'C', lang: 'fr', date: '2026-10-08', status: 'published', ...fm }).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n${body}\n`;

test('a bad post is blocked by the facts, banned-claim, links, meta and cannibalisation gates', async () => {
  const r = await variant(root => fs.writeFileSync(path.join(root, 'content/alpha.test/fr/posts/mauvais.md'), post({
    title: 'Court', description: 'Trop court.', slug: 'mauvais', primary_keyword: 'fenetre utilisation test', cluster: 'test_dates', concept_id: 'test_bad',
  }, 'Chez [[wt:bab-makka|prix omra]] tout est simple. Visa garanti en 3 jours ! Voir [[link:inexistant|ici]].')));
  const gates = new Set(r.errors.map(e => e.gate));
  for (const g of ['facts', 'banned-claim', 'links', 'meta', 'cannibalisation', 'citations', 'unknowns']) assert.ok(gates.has(g), g);
  const msgs = r.errors.map(e => e.msg).join('\n');
  assert.match(msgs, /digits-without-fact/);
  assert.match(msgs, /exact-match commercial anchor/);
  assert.match(msgs, /unresolved same-site link/);
  assert.match(msgs, /first sentence/);
  assert.match(msgs, /same primary keyword/);
  assert.deepEqual(r.written, []); // strict: nothing written
});

test('near-duplicate pages, reciprocal sister links and off-flow links are blocked', async () => {
  const r = await variant(root => {
    const src = fs.readFileSync(path.join(root, 'content/alpha.test/fr/posts/premier-article.md'), 'utf8');
    fs.writeFileSync(path.join(root, 'content/alpha.test/fr/posts/copie.md'), src
      .replace('slug: premier-article', 'slug: copie').replace('fenetre utilisation test', 'copie test').replace('concept_id: test_window', 'concept_id: test_copy')
      .replace('Premier article : la fenêtre', 'Un texte copié : la durée').replace('Article de démonstration avec', 'Copie de démonstration avec')
      .replace('[[site:beta.test/article-beta|l\'article du site Beta]]', 'la page de données'));
    // beta links back to the exact alpha page that links to it -> reciprocal pair
    const b = path.join(root, 'content/beta.test/fr/posts/article-beta.md');
    fs.writeFileSync(b, fs.readFileSync(b, 'utf8').replace('[[site:alpha.test/guide-test|le guide d\'Alpha]]', '[[site:alpha.test/premier-article|le guide d\'Alpha]]'));
    const net = path.join(root, 'config/network.json');
    const n = JSON.parse(fs.readFileSync(net, 'utf8')); n.sites[1].flows = []; fs.writeFileSync(net, JSON.stringify(n));
  });
  const msgs = r.errors.map(e => `${e.gate}: ${e.msg}`).join('\n');
  assert.match(msgs, /duplicate: 5-shingle Jaccard/);
  assert.match(msgs, /reciprocal sister links/);
  assert.match(msgs, /not in the flow map/);
});

test('licence numbers never render without an approved official fact; stale facts show a banner', async () => {
  const r = await variant(root => {
    const f = path.join(root, 'content/alpha.test/fr/pages/editeur.md');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8') + '\nAgence en activité depuis 2016 [[fact:fact_wikitours_licence]].\n');
    const p = path.join(root, 'content/alpha.test/fr/posts/troisieme-article.md');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + '\nUn ancien chiffre : 12 [[fact:fact_test_old]].\n');
  });
  const msgs = r.errors.map(e => `${e.gate}: ${e.msg}`).join('\n');
  assert.match(msgs, /licence: « depuis 2016 »/);
  assert.match(msgs, /fact-not-approved fact_wikitours_licence/);
  const stale = r.pages.find(p => p.fm.slug === 'troisieme-article');
  assert.deepEqual(stale.staleFacts, ['fact_test_old']);
  assert.ok(stale.html.includes('stale-banner'));
  assert.ok(stale.noindexFinal, 'more than 14 days past review_by -> noindex, out of the sitemap');
  assert.ok(r.warnings.some(w => w.gate === 'facts' && /fact-past-review/.test(w.msg)));
});

test('Arabic and English pages: /ar/ and /en/ URLs, rtl, hreflang (homes always, pages by translation_key)', async () => {
  const ar = post({ title: 'دليل الاختبار: صفحة عربية للتجربة فقط', description: 'صفحة عربية في موقع الاختبار للتحقق من الاتجاه من اليمين إلى اليسار ومن روابط اللغات البديلة بين الصفحتين.',
    slug: 'guide-test', type: 'checklist', lang: 'ar', primary_keyword: 'دليل اختبار', cluster: 'test_dates', concept_id: 'test_calendar', translation_key: 'calendar',
    sources: [{ title: 'مصدر تجريبي', publisher: 'Exemple', url: 'https://example.org/ar', accessed: '2026-10-20' }] }, 'نص تجريبي قصير.');
  const blocked = await variant(root => {
    fs.mkdirSync(path.join(root, 'content/alpha.test/ar/pages'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/alpha.test/ar/pages/guide-test.md'), ar);
    const net = path.join(root, 'config/network.json');
    const n = JSON.parse(fs.readFileSync(net, 'utf8')); n.sites[0].languages = ['fr', 'ar']; fs.writeFileSync(net, JSON.stringify(n));
  });
  // DECISIONS D-H: the Arabic reviewer is recommended (warning), not required.
  assert.ok(blocked.warnings.some(w => w.gate === 'arabic-review'));
  assert.ok(!blocked.errors.some(e => e.gate === 'arabic-review'));
  // With a (fixture-only) reviewer, Arabic and English home pages, the pairs render.
  const r = await variant(root => {
    fs.mkdirSync(path.join(root, 'content/alpha.test/ar/pages'), { recursive: true });
    const signed = s => s.replace('---\n', '---\nreviewed_by: "fixture-reviewer"\nreviewed_at: "2026-10-19"\nfull_read: true\n');
    fs.writeFileSync(path.join(root, 'content/alpha.test/ar/pages/guide-test.md'), signed(ar));
    fs.writeFileSync(path.join(root, 'content/alpha.test/ar/pages/accueil.md'), signed(post({ title: 'ألفا: الصفحة الرئيسية العربية للاختبار', description: 'الصفحة الرئيسية العربية لموقع الاختبار ألفا، تستعمل فقط في الاختبارات الآلية للمحرك وللتحقق من العرض.', slug: 'accueil', type: 'home', lang: 'ar', tier: undefined }, 'مرحبا.')));
    fs.mkdirSync(path.join(root, 'content/alpha.test/en/pages'), { recursive: true });
    fs.writeFileSync(path.join(root, 'content/alpha.test/en/pages/accueil.md'), post({ title: 'Alpha Test: the English home page of the fixture', description: 'English home page of the Alpha fixture site, used only by the automated engine tests to check English rendering.', slug: 'accueil', type: 'home', lang: 'en', tier: undefined }, 'Welcome. This English page is a guaranteed test.'));
    const fr = path.join(root, 'content/alpha.test/fr/pages/guide-test.md');
    fs.writeFileSync(fr, fs.readFileSync(fr, 'utf8').replace('nav_order: 1', 'nav_order: 1\ntranslation_key: calendar'));
    fs.writeFileSync(path.join(root, 'config/authors.json'), JSON.stringify([{ id: 'fixture-reviewer', name: 'Relecteur fictif de test', role: 'fixture' }]));
    const net = path.join(root, 'config/network.json');
    const n = JSON.parse(fs.readFileSync(net, 'utf8')); n.sites[0].languages = ['fr', 'ar', 'en']; fs.writeFileSync(net, JSON.stringify(n));
  });
  const enHome = r.pages.find(p => p.lang === 'en' && p.fm.type === 'home');
  assert.equal(enHome.url, '/en/');
  assert.match(enHome.html, /<html lang="en-MA" dir="ltr">/);
  for (const [l, href] of [['fr-MA', 'https://alpha.test/'], ['ar-MA', 'https://alpha.test/ar/'], ['en-MA', 'https://alpha.test/en/'], ['x-default', 'https://alpha.test/']])
    assert.ok(enHome.html.includes(`<link rel="alternate" hreflang="${l}" href="${href}">`), l);
  assert.ok(r.errors.some(e => e.gate === 'banned-claim' && /guaranteed/.test(e.msg)), 'English banned claims apply');
  const arPage = r.pages.find(p => p.lang === 'ar' && p.fm.slug === 'guide-test');
  assert.equal(arPage.url, '/ar/guide-test/');
  assert.match(arPage.html, /<html lang="ar-MA" dir="rtl">/);
  assert.match(arPage.html, /<link rel="alternate" hreflang="fr-MA" href="https:\/\/alpha\.test\/guide-test\/">/);
  assert.match(arPage.html, /hreflang="x-default" href="https:\/\/alpha\.test\/guide-test\/"/);
  assert.match(arPage.html, /راجعه Relecteur fictif de test/);
  const frPage = r.pages.find(p => p.lang === 'fr' && p.fm.slug === 'guide-test');
  assert.match(frPage.html, /hreflang="ar-MA" href="https:\/\/alpha\.test\/ar\/guide-test\/"/);
  assert.ok(r.errors.some(e => e.gate === 'facts' && /rule-word-without-fact.*guaranteed/.test(e.msg)), 'English rule words need a fact');
  // Same concept in another language on the same site is allowed: only the two intended English errors remain.
  assert.deepEqual(r.errors.filter(e => !['banned-claim', 'facts'].includes(e.gate)).map(e => e.msg), []);
});
