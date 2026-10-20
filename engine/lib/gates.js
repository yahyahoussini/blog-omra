// Automated quality gates (STRATEGY 7.4, adapted by DECISIONS). Each finding:
// { level: 'error'|'warning'|'info', gate, site, file, url, msg }. One error blocks the build.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readJSON, stripMarkers } from './util.js';
import { factsGate, requiredWordingGate, splitSentences } from './facts-gate.js';
import { matchKey } from './normalize.js';
import { shingles, jaccard, simhash, hamming, similarPairs, words } from './similarity.js';
import { MENTION } from './markdown.js';
import { RESERVED_SLUGS, ARTICLE_TYPES } from './content.js';

const SCHEMA_DIR = new URL('../schemas/', import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false, useDefaults: true });
addFormats(ajv);
export const validateFrontmatter = ajv.compile(readJSON(new URL('frontmatter.schema.json', SCHEMA_DIR)));
export const validateFact = ajv.compile(readJSON(new URL('registry.schema.json', SCHEMA_DIR)));
const ajvMsg = errs => errs.map(e => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + e.params.allowedValues.join('|') : ''}`).join('; ');

export const LIMITS = { titleMin: 20, titleMax: 70, descMin: 70, descMax: 160, dupBlock: 0.5, dupWarn: 0.3, simhashBlock: 3, titleJaccard: 0.6, simhashMinWords: 40 };
const MIN_SOURCES = { pillar: 2, guide: 2, news: 2, data: 2, explainer: 1, checklist: 1, local: 1, home: 0, trust: 0, hub: 0, tool: 0 };
const WORD_FLOORS = { pillar: 1500, guide: 1500, explainer: 800, checklist: 800, local: 800, hub: 600 };
const UNKNOWN_REQUIRED = new Set(['pillar', 'guide', 'explainer']);
const EVERGREEN = new Set(['home', 'pillar', 'guide', 'explainer', 'checklist', 'hub', 'local', 'tool', 'trust']);
const BANNED = [
  [/(?<!\p{L})garanti(e|es|s)?(?!\p{L})/iu, '« garanti »'],
  [/100\s?%/u, '« 100 % »'],
  [/مضمون/u, '« مضمون »'],
  [/0\s?%\s*d['’]\s?int[ée]r[êe]t/iu, '« 0 % d\'intérêt »'],
  [/sans\s+int[ée]r[êe]ts?/iu, '« sans intérêt »'],
  [/(derni[èe]res?|plus que \S+|seulement \S+)\s+places?/iu, 'fake urgency (places)'],
  [/places?\s+limit[ée]es?/iu, 'fake urgency (places limitées)'],
  [/d[ée]p[êe]chez[- ]vous|ne tardez pas|offre expire|compte à rebours|vite,? r[ée]servez/iu, 'fake urgency'],
  [/(wiki\s?tours|bab\s?makka)[^.!?]{0,60}(meilleur|n°\s?1|numéro 1|leader|le plus fiable|la plus fiable|incontournable)/iu, 'superlative about Wiki Tours'],
  [/(meilleur|n°\s?1|numéro 1|leader)[^.!?]{0,40}(wiki\s?tours|bab\s?makka)/iu, 'superlative about Wiki Tours'],
];
const BANNED_EN = [
  [/(?<!\p{L})guarantee(d|s)?(?!\p{L})/iu, '« guaranteed »'],
  [/0\s?%\s*interest|interest[- ]free/iu, '« 0% interest »'],
  [/(last|only \S+)\s+(seats|places|spots)|limited (seats|places|spots)|hurry|book now before/iu, 'fake urgency'],
];
// English stems the French/Arabic CLAIM_WORDS of the ported gate do not cover.
const EN_RULE_WORDS = /(?<!\p{L})(mandator|requir|forbid|prohibit|free of charge|guarante|refund|deadline)\p{L}*/iu;
const FORBIDDEN_LD = new Set(['LocalBusiness', 'TravelAgency', 'Event', 'HowTo', 'Review', 'AggregateRating']);
const LICENCE_PATTERNS = [/ODV[-\s]?\d+/i, /licen[cs]e\s+(n°|no\.?|number|numéro)/i, /agr[ée]ment\s+(n°|no\.?|numéro)/i];
const SINCE_PATTERN = /depuis\s+2016|since\s+2016|منذ\s+2016/i;

// ---------- registry ----------
export function registryGate(project, add) {
  const seen = new Set();
  for (const f of project.registryList) {
    if (seen.has(f.id)) add('error', 'registry', null, `duplicate fact id ${f.id}`);
    seen.add(f.id);
    if (!validateFact(f)) add('error', 'registry', null, `${f.id}: ${ajvMsg(validateFact.errors)}`);
  }
}

// ---------- 1. front matter (all files, drafts included) ----------
export function frontmatterGate(project, all, add, today) {
  const authorIds = new Set(project.authors.map(a => a.id));
  const slugs = new Map(), homes = new Map();
  for (const p of all) {
    const fm = p.fm;
    const level = fm.status === 'published' ? 'error' : 'warning';
    const ok = validateFrontmatter(fm);
    if (!ok) { add(level, 'frontmatter', p, ajvMsg(validateFrontmatter.errors)); p.invalid = true; continue; }
    if (fm.lang !== p.lang) add(level, 'frontmatter', p, `lang "${fm.lang}" but file is under /${p.lang}/`);
    if (fm.slug !== p.fileSlug) add(level, 'frontmatter', p, `slug "${fm.slug}" must equal the file name "${p.fileSlug}.md"`);
    if (p.kind === 'posts') {
      for (const k of ['tier', 'primary_keyword', 'cluster', 'concept_id']) if (!fm[k]) add(level, 'frontmatter', p, `posts require "${k}"`);
      if (['home', 'trust'].includes(fm.type)) add(level, 'frontmatter', p, `type "${fm.type}" is only for pages`);
    } else if (RESERVED_SLUGS.has(fm.slug)) add(level, 'frontmatter', p, `slug "${fm.slug}" is reserved`);
    if (fm.author && fm.author !== 'org' && !authorIds.has(fm.author)) add(level, 'frontmatter', p, `author "${fm.author}" is not in config/authors.json (real people only)`);
    if (fm.reviewed_by && !authorIds.has(fm.reviewed_by)) add(level, 'frontmatter', p, `reviewed_by "${fm.reviewed_by}" is not in config/authors.json`);
    if (fm.cta?.type === 'wikitours' && !project.wtTargets[fm.cta.wt_target]) add(level, 'frontmatter', p, `cta.wt_target "${fm.cta.wt_target}" is not in config/wikitours-targets.json`);
    if (fm.updated && fm.updated < fm.date) add(level, 'frontmatter', p, 'updated is before date');
    if (fm.status !== 'published') continue;
    // DECISIONS D-H overrides gate 21 (auto mode): a native Arabic reviewer is recommended, not required.
    if (fm.lang === 'ar' && !(fm.reviewed_by && fm.full_read)) add('warning', 'arabic-review', p, 'Arabic page without a native reviewer\'s full read (recommended, DECISIONS D-H)');
    const key = `${p.site}|${p.lang}|${fm.slug}`;
    if (slugs.has(key)) add('error', 'frontmatter', p, `slug "${fm.slug}" already used by ${slugs.get(key)}`);
    slugs.set(key, p.file);
    if (fm.type === 'home') {
      if (homes.has(`${p.site}|${p.lang}`)) add('error', 'frontmatter', p, 'two home pages for this site and language');
      homes.set(`${p.site}|${p.lang}`, p.file);
    }
  }
  for (const site of project.sites.values()) {
    const langs = new Set(all.filter(p => p.site === site.domain && p.fm.status === 'published').map(p => p.lang));
    for (const lang of langs) if (!homes.has(`${site.domain}|${lang}`)) add('error', 'frontmatter', { site: site.domain }, `no published home page (type: home) for ${lang}`);
  }
}

// ---------- 2. facts ----------
function factsGateForPage(project, p, add, today) {
  for (const { field, text: raw } of p.gateTexts) {
    const text = String(raw ?? '').replace(/\u00A0/g, ' '); // French no-break spaces read as plain spaces
    const { errors } = factsGate(text, project.registry, { today, approvedPhrases: project.approvedPhrases });
    for (const e of errors) {
      const stale = e.rule === 'fact-past-review' || e.rule === 'fact-expired';
      add(stale ? 'warning' : 'error', 'facts', p, `${field}: ${e.rule}${e.id ? ' ' + e.id : ''}${e.value ? ' value ' + e.value : ''}${e.status ? ' (status ' + e.status + ')' : ''}${e.sentence ? ' — « ' + e.sentence.slice(0, 140) + ' »' : ''}${stale ? ' (page shows « information en cours de mise à jour »)' : ''}`);
    }
    if (p.lang === 'en') for (const s of splitSentences(text)) if (!/\[\[fact:/.test(s) && EN_RULE_WORDS.test(s))
      add('error', 'facts', p, `${field}: rule-word-without-fact — « ${s.slice(0, 140)} »`);
    for (const e of requiredWordingGate(text, project.registry)) add('error', 'facts', p, `${field}: ${e.id} must be written with its required wording « ${e.wording} » in the same sentence`);
  }
  if (p.dropFromSitemap) add('warning', 'facts', p, 'a cited fact is more than 14 days past review_by: page is noindex and out of the sitemap until fixed');
}

// ---------- 5. entities (warning) ----------
function entityGate(project, p, add) {
  const allowed = project.entities.allowed.map(s => s.toLowerCase());
  const re = /(?:\b(?:agence|compagnie|soci[ée]t[ée])\s+((?:[A-Z][\p{L}'’-]+\s?){1,4}))|((?:[A-Z][\p{L}'’-]+\s){1,3}(?:Tours|Travel|Voyages|Airlines?|Airways|Aviation))/gu;
  const found = new Set();
  for (const m of p.plain.matchAll(re)) {
    const name = (m[1] || m[2]).trim();
    if (!allowed.some(a => name.toLowerCase().includes(a) || a.includes(name.toLowerCase()))) found.add(name);
  }
  for (const n of found) add('warning', 'entities', p, `« ${n} » is not on the allowed entity list (config/entities.json)`);
}

// ---------- 6. cannibalisation (network-wide) ----------
function cannibalGate(project, pages, add) {
  const reservedConcepts = new Set(project.targets.reserved_concepts.map(c => c.concept_id));
  const reservedKw = project.targets.reserved_keyword_patterns.map(s => new RegExp(s, 'i'));
  const art = pages.filter(p => p.fm.primary_keyword);
  const byKey = new Map(), byConcept = new Map(), clusterOwner = new Map();
  for (const p of art) {
    const fm = p.fm;
    if (reservedConcepts.has(fm.concept_id)) add('error', 'cannibalisation', p, `concept "${fm.concept_id}" is reserved for wikitours.ma`);
    if (reservedKw.some(r => r.test(stripMarkers(fm.primary_keyword)))) add('error', 'cannibalisation', p, `primary keyword "${fm.primary_keyword}" matches a wikitours.ma-reserved topic`);
    const k = `${p.lang}|${matchKey(fm.primary_keyword)}`;
    if (byKey.has(k)) add('error', 'cannibalisation', p, `same primary keyword as ${byKey.get(k).absUrl}`); else byKey.set(k, p);
    // DECISIONS D-H: a concept stays on one site in every language, and once per language.
    const prev = byConcept.get(fm.concept_id) || [];
    const clash = prev.find(o => o.site !== p.site || o.lang === p.lang);
    if (clash) add('error', 'cannibalisation', p, `concept "${fm.concept_id}" already served by ${clash.absUrl} (${clash.site !== p.site ? 'owned by another site' : 'same language: update that page instead'})`);
    byConcept.set(fm.concept_id, [...prev, p]);
    const owner = clusterOwner.get(fm.cluster);
    if (owner && owner !== p.site) add('error', 'cannibalisation', p, `cluster "${fm.cluster}" belongs to ${owner}`); else clusterOwner.set(fm.cluster, p.site);
  }
  const tok = p => new Set(matchKey(stripMarkers(p.fm.title)).split(' ').filter(Boolean));
  for (let i = 0; i < art.length; i++) for (let j = i + 1; j < art.length; j++) {
    const a = art[i], b = art[j];
    if (a.lang !== b.lang) continue;
    const s = jaccard(tok(a), tok(b));
    if (s >= LIMITS.titleJaccard) add('error', 'cannibalisation', b, `title too close (${s.toFixed(2)}) to ${a.absUrl}`);
  }
}

// ---------- 7. duplicate (network-wide, all pages incl. trust; template text already stripped) ----------
export function duplicateGate(pages, add) {
  const docs = pages.map((p, i) => ({ id: i, shingles: shingles(p.plain, 5) }));
  for (const { a, b, score } of similarPairs(docs, LIMITS.dupWarn)) {
    const pa = pages[a], pb = pages[b];
    add(score >= LIMITS.dupBlock ? 'error' : 'warning', 'duplicate', pb, `5-shingle Jaccard ${score.toFixed(2)} vs ${pa.absUrl}`);
  }
  const hashed = pages.map((p, i) => ({ i, n: words(p.plain).length })).filter(x => x.n >= LIMITS.simhashMinWords).map(x => ({ ...x, h: simhash(pages[x.i].plain) }));
  for (let x = 0; x < hashed.length; x++) for (let y = x + 1; y < hashed.length; y++) {
    const d = hamming(hashed[x].h, hashed[y].h);
    if (d <= LIMITS.simhashBlock) add('error', 'duplicate', pages[hashed[y].i], `SimHash distance ${d} vs ${pages[hashed[x].i].absUrl}`);
  }
}

// ---------- 9. links ----------
const hrefs = html => [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/g)].map(m => ({ href: m[1].replace(/&amp;/g, '&'), tag: m[0] }));
const isoWeek = ymd => { const d = new Date(ymd + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3); const y = d.getUTCFullYear(); const w = 1 + Math.round(((d - Date.UTC(y, 0, 4)) / 864e5 - 3 + ((new Date(Date.UTC(y, 0, 4)).getUTCDay() + 6) % 7)) / 7); return `${y}-W${String(w).padStart(2, '0')}`; };

// True when the first wikitours.ma link sits in the first sentence of the body (template parts ignored).
export function wtInFirstSentence(bodyHtml) {
  const html = bodyHtml.replace(/<!--nogate-->[\s\S]*?<!--\/nogate-->/g, '');
  const at = html.indexOf('class="wt-link"');
  if (at < 0) return false;
  const before = html.slice(0, at).replace(/<\/(p|li|h[1-6]|td|tr|div|aside|section|blockquote)>/g, '. ').replace(/<[^>]+>/g, ' ');
  return !/[.!?؟](\s|$)/.test(before.replace(/^[\s.]+/, ''));
}

function linksGate(project, pages, add) {
  const policy = project.linkPolicy;
  const domains = new Set(project.sites.keys());
  const banned = (policy.banned_money_anchor_patterns || []).map(s => new RegExp(s, 'i'));
  const brand = (policy.brand_anchor_patterns || []).map(s => new RegExp(s, 'i'));
  const sisterEdges = new Map(); // "fromUrl>toUrl"
  const pairWeek = new Map();
  const perSite = new Map();
  for (const p of pages) {
    for (const e of p.linkErrors) add('error', 'links', p, e);
    const flows = new Set(project.sites.get(p.site).meta.flows || []);
    const same = p.links.filter(l => l.kind === 'same' && l.where === 'body');
    const sister = p.links.filter(l => l.kind === 'sister');
    const wt = p.links.filter(l => l.kind === 'wt');
    // raw Markdown links: internal ones count as same-site; network / wikitours ones are not allowed.
    let rawInternal = 0;
    for (const { href, tag } of hrefs(p.bodyHtml)) {
      if (href.startsWith('#') || /class="cta__button"/.test(tag)) continue;
      if (href.startsWith('/')) { if (!same.some(l => l.href === href)) rawInternal++; continue; }
      let host; try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { continue; }
      if (host === 'wa.me') continue;
      if (host === p.site) add('error', 'links', p, `absolute link to this site (${href}): use [[link:slug|anchor]]`);
      else if (host === 'wikitours.ma' && !/class="wt-link"/.test(tag)) add('error', 'links', p, `raw link to wikitours.ma (${href}): use [[wt:target|anchor]]`);
      else if (domains.has(host) && !sister.some(l => l.href === href)) add('error', 'links', p, `raw link to a sister site (${href}): use [[site:domain/slug|anchor]]`);
      if (host === 'wikitours.ma' && policy.money_link_rel && !new RegExp(`rel="[^"]*${policy.money_link_rel}`).test(tag)) add('error', 'links', p, `wikitours.ma link without rel="${policy.money_link_rel}"`);
    }
    if (p.kind === 'posts' && same.length + rawInternal < policy.min_same_site_links_per_post)
      add('error', 'links', p, `${same.length + rawInternal} same-site links in the body, posts need ≥ ${policy.min_same_site_links_per_post}`);
    if (sister.length > policy.sister_links_per_post) add('error', 'links', p, `${sister.length} sister links > ${policy.sister_links_per_post} per post`);
    for (const l of sister) {
      if (!flows.has(l.domain)) add('error', 'links', p, `sister link to ${l.domain} is not in the flow map of ${p.site} (config/network.json)`);
      sisterEdges.set(`${p.absUrl}>${l.href}`, p);
      const k = `${p.site}>${l.domain}|${isoWeek(p.fm.date)}`;
      pairWeek.set(k, (pairWeek.get(k) || 0) + 1);
    }
    if (wt.length > policy.money_links_per_post) add('error', 'links', p, `${wt.length} links to wikitours.ma > ${policy.money_links_per_post}`);
    for (const l of wt) {
      if (banned.some(r => r.test(l.anchor))) add('error', 'links', p, `exact-match commercial anchor to wikitours.ma: « ${l.anchor} »`);
    }
    if ([...p.bodyHtml.matchAll(/<table[\s\S]*?<\/table>/g)].some(m => m[0].includes('class="wt-link"')))
      add('error', 'links', p, 'wikitours.ma link inside a table (STRATEGY 3.5: never inside tables)');
    if (policy.money_link_not_in_first_paragraph && wtInFirstSentence(p.bodyHtml))
      add('error', 'links', p, 'wikitours.ma link in the first sentence of the body (STRATEGY 3.5)');
    const s = perSite.get(p.site) || { posts: 0, withWt: 0, wt: 0, brand: 0 };
    if (p.kind === 'posts') { s.posts++; if (wt.length) s.withWt++; }
    s.wt += wt.length; s.brand += wt.filter(l => brand.some(r => r.test(l.anchor))).length;
    perSite.set(p.site, s);
  }
  if (policy.block_reciprocal_page_pairs) {
    for (const [edge, p] of sisterEdges) {
      const [from, to] = edge.split('>');
      if (sisterEdges.has(`${to}>${from}`) && from < to) add('error', 'links', p, `reciprocal sister links between ${from} and ${to}`);
    }
  }
  for (const [k, n] of pairWeek) if (n > policy.max_links_per_sister_pair_per_week)
    add('error', 'links', { site: k.split('>')[0] }, `${n} sister links ${k} > ${policy.max_links_per_sister_pair_per_week} per pair per week`);
  for (const [site, s] of perSite) {
    const cap = project.sites.get(site).meta.money_share_cap;
    if (cap != null && s.posts >= 5 && s.withWt / s.posts > cap) add('warning', 'links', { site }, `${Math.round(100 * s.withWt / s.posts)}% of posts link to wikitours.ma (cap ${Math.round(cap * 100)}%)`);
    if (s.wt >= 5 && s.brand / s.wt < policy.brand_anchor_min_share) add('warning', 'links', { site }, `brand anchors are ${Math.round(100 * s.brand / s.wt)}% of wikitours.ma links (target ≥ ${Math.round(policy.brand_anchor_min_share * 100)}%)`);
  }
}

// Every internal href/src resolves; every content page has at least one inbound link (no orphans).
function resolutionGate(project, outputs, pages, add) {
  for (const [domain, files] of outputs) {
    const paths = new Set();
    for (const f of files.keys()) { paths.add('/' + f); if (f.endsWith('index.html')) paths.add('/' + f.slice(0, -'index.html'.length)); }
    const inbound = new Map();
    for (const [file, content] of files) {
      if (!file.endsWith('.html')) continue;
      const self = '/' + file.replace(/index\.html$/, '');
      for (const m of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
        let href = m[1].replace(/&amp;/g, '&');
        if (href.startsWith(`https://${domain}/`)) href = href.slice(`https://${domain}`.length);
        if (!href.startsWith('/') || href.startsWith('//')) continue;
        const clean = href.split('#')[0].split('?')[0];
        if (!paths.has(clean)) add('error', 'links', { site: domain, url: self }, `internal link does not resolve: ${href}`);
        else if (clean !== self) inbound.set(clean, (inbound.get(clean) || 0) + 1);
      }
    }
    for (const p of pages.filter(x => x.site === domain && x.fm.type !== 'home'))
      if (!inbound.get(p.url)) add('error', 'links', p, 'orphan page: no other page links to it');
  }
}

// ---------- page-level gates ----------
function pageGates(project, p, add, today, seasonYear) {
  const fm = p.fm;
  const title = stripMarkers(fm.title), desc = stripMarkers(fm.description);
  if (fm.tier === 'A' && (fm.author || 'org') === 'org') add('warning', 'byline', p, 'tier A expects a named author and reviewer (STRATEGY 4.5); published with the organisation byline');
  // 8. citations
  const min = p.kind === 'posts' ? Math.max(1, MIN_SOURCES[fm.type] ?? 1) : (MIN_SOURCES[fm.type] ?? 1);
  if (p.sources.length < min) add('error', 'citations', p, `${p.sources.length} sources, ${fm.type} needs ≥ ${min}`);
  // 10. disclosure
  const mentions = MENTION.test([fm.title, fm.description, p.plain, ...(fm.faq || []).flatMap(f => [f.q, f.a])].join(' ')) || p.links.some(l => l.kind === 'wt');
  if (mentions && !(p.disclosed && p.html.includes('box--disclosure'))) add('error', 'disclosure', p, 'mentions or links Wiki Tours / Bab Makka without the disclosure box');
  // 12. meta lengths (uniqueness is network-wide below)
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) add('error', 'meta', p, `title is ${title.length} chars (${LIMITS.titleMin}-${LIMITS.titleMax})`);
  if (desc.length < LIMITS.descMin || desc.length > LIMITS.descMax) add('error', 'meta', p, `description is ${desc.length} chars (${LIMITS.descMin}-${LIMITS.descMax})`);
  // 13. stale year in title / H1
  for (const y of (title.match(/(?<!\d)20\d\d(?!\d)/g) || []).map(Number))
    if (y < seasonYear) add(EVERGREEN.has(fm.type) || p.kind === 'posts' && !['news', 'data'].includes(fm.type) ? 'error' : 'warning', 'stale-year', p, `year ${y} in title < season ${seasonYear}`);
  // 14. banned claims
  const exceptions = project.phrases.banned_claim_exceptions || [];
  let text = [title, desc, p.plain, ...(fm.faq || []).flatMap(f => [stripMarkers(f.q), stripMarkers(f.a)])].join('\n');
  for (const e of exceptions) text = text.split(e).join(' ');
  for (const [re, label] of p.lang === 'en' ? [...BANNED, ...BANNED_EN] : BANNED) if (re.test(text)) add('error', 'banned-claim', p, `banned claim ${label}: « ${(text.match(re) || [''])[0]} »`);
  // 16. unknowns section
  if (UNKNOWN_REQUIRED.has(fm.type) && !p.hasUnknown) add('error', 'unknowns', p, `${fm.type} pages need a :::unknown section`);
  // editorial word floors (STRATEGY 7.3; not a ranking rule) and images
  const floor = WORD_FLOORS[fm.type];
  const wc = words(p.plain).length;
  if (floor && wc < floor) add('warning', 'word-floor', p, `${wc} words < editorial floor ${floor} for ${fm.type}`);
  for (const im of p.images) if (!im.alt?.trim()) add('warning', 'images', p, `image without alt text: ${im.src}`);
}

// JSON-LD parses, no forbidden types, one H1, lang/dir and self-canonical on every HTML output.
function htmlGates(project, outputs, add) {
  for (const [domain, files] of outputs) for (const [file, html] of files) {
    if (!file.endsWith('.html')) continue;
    const where = { site: domain, url: '/' + file.replace(/index\.html$/, '') };
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) add('error', 'meta', where, `${h1} <h1> elements (exactly 1 expected)`);
    if (!/<html lang="(fr|ar|en)-MA" dir="(ltr|rtl)">/.test(html)) add('error', 'meta', where, 'missing lang/dir on <html>');
    if (file !== '404.html' && !html.includes(`<link rel="canonical" href="https://${domain}${where.url}">`)) add('error', 'meta', where, 'missing self-canonical');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data; try { data = JSON.parse(m[1]); } catch (e) { add('error', 'schema', where, `JSON-LD does not parse: ${e.message}`); continue; }
      const types = JSON.stringify(data).match(/"@type":"([^"]+)"/g)?.map(s => s.slice(9, -1)) || [];
      for (const t of types) if (FORBIDDEN_LD.has(t)) add('error', 'schema', where, `forbidden JSON-LD type ${t} on a satellite`);
    }
    // 20. licence / « depuis 2016 »
    const text = html.replace(/<[^>]+>/g, ' ');
    const lic = project.registry[project.publisher.licence?.fact_id || 'fact_wikitours_licence'];
    const licOk = lic?.status === 'approved' && lic.source_tier === 'official' && project.publisher.licence?.official_list_url;
    if (!licOk && LICENCE_PATTERNS.some(r => r.test(text))) add('error', 'licence', where, 'licence number shown but fact_wikitours_licence is not approved with an official source (gate 20)');
    const since = project.registry[project.publisher.since_fact_id || 'fact_wikitours_since_2016'];
    if (!(since?.status === 'approved' && ['official', 'academic'].includes(since.source_tier)) && SINCE_PATTERN.test(text)) add('error', 'licence', where, '« depuis 2016 » shown but fact_wikitours_since_2016 is not approved with an official source (gate 20)');
  }
}

function metaUniqueness(pages, generated, add) {
  const seenT = new Map(), seenD = new Map();
  const check = (item, level, where) => {
    const t = item.title.trim().toLowerCase(), d = item.description.trim().toLowerCase();
    if (seenT.has(t)) add(level, 'meta', where, `title already used by ${seenT.get(t)}`); else seenT.set(t, where.absUrl || where.url);
    if (seenD.has(d)) add(level, 'meta', where, `description already used by ${seenD.get(d)}`); else seenD.set(d, where.absUrl || where.url);
  };
  for (const p of pages) check({ title: stripMarkers(p.fm.title), description: stripMarkers(p.fm.description) }, 'error', p);
  for (const g of generated) {
    if (g.kind === 'notfound') continue;
    check(g, 'warning', { site: g.site, url: g.url, absUrl: `https://${g.site}${g.url}` });
    if (g.title.length > LIMITS.titleMax) add('warning', 'meta', { site: g.site, url: g.url }, `generated title is ${g.title.length} chars`);
    if (g.description.length < LIMITS.descMin || g.description.length > LIMITS.descMax) add('warning', 'meta', { site: g.site, url: g.url }, `generated description is ${g.description.length} chars (set blog.description in config/sites)`);
  }
}

export const seasonYearOf = today => { const y = Number(today.slice(0, 4)); return today.slice(5) >= '06-01' ? y + 1 : y; };

// Runs every post-render gate. state = { project, pages, generated, outputs, today, add }
export function runGates({ project, pages, generated, outputs, today, add }) {
  const seasonYear = seasonYearOf(today);
  for (const p of pages) {
    factsGateForPage(project, p, add, today);
    entityGate(project, p, add);
    pageGates(project, p, add, today, seasonYear);
  }
  cannibalGate(project, pages, add);
  duplicateGate(pages, add);
  linksGate(project, pages, add);
  resolutionGate(project, outputs, pages, add);
  metaUniqueness(pages, generated, add);
  htmlGates(project, outputs, add);
  for (const site of project.sites.values())
    if (!site.config.whatsapp?.number && pages.some(p => p.site === site.domain))
      add('warning', 'whatsapp', { site: site.domain }, 'whatsapp.number is null: CTAs link to the contact page until the client provides the number (STRATEGY 2.1 A5)');
}

export { ARTICLE_TYPES };
