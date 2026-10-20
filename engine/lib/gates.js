// Automated quality gates (STRATEGY 7.4, adapted by DECISIONS). Each finding:
// { level: 'error'|'warning'|'info', gate, site, file, url, msg }. One error blocks the build.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readJSON, stripMarkers } from './util.js';
import { factsGate, requiredWordingGate } from './facts-gate.js';
import { phrasesFor } from './config.js';
import { graphemes, LANGS } from './i18n.js';
import { matchKey } from './normalize.js';
import { docFeatures, hamming, jaccard, similarPairs, similarSetPairs, simhashBuckets } from './similarity.js';
import { MENTION, plainText } from './markdown.js';
import { RESERVED_SLUGS, ARTICLE_TYPES, langPrefix } from './content.js';
import { navFor, forLang } from './render.js';

const SCHEMA_DIR = new URL('../schemas/', import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false, useDefaults: true });
addFormats(ajv);
export const validateFrontmatter = ajv.compile(readJSON(new URL('frontmatter.schema.json', SCHEMA_DIR)));
export const validateFact = ajv.compile(readJSON(new URL('registry.schema.json', SCHEMA_DIR)));
export const validateKb = ajv.compile(readJSON(new URL('kb.schema.json', SCHEMA_DIR)));
const ajvMsg = errs => errs.map(e => `${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + e.params.allowedValues.join('|') : ''}`).join('; ');

export const LIMITS = { titleMin: 20, titleMax: 70, descMin: 70, descMax: 160, dupBlock: 0.5, dupWarn: 0.3, simhashBlock: 3, titleJaccard: 0.6, simhashMinWords: 40 };
const MIN_SOURCES = { pillar: 2, guide: 2, news: 2, data: 2, explainer: 1, checklist: 1, local: 1, home: 0, trust: 0, hub: 0, tool: 0 };
const WORD_FLOORS = { pillar: 1500, guide: 1500, explainer: 800, checklist: 800, local: 800, hub: 600 };
const UNKNOWN_REQUIRED = new Set(['pillar', 'guide', 'explainer']);
const EVERGREEN = new Set(['home', 'pillar', 'guide', 'explainer', 'checklist', 'hub', 'local', 'tool', 'trust']);
// Banned claims (gate 14) per language. Every list applies to every page (a banned claim is banned whatever the page
// language); the split keeps each language's wording in one place. Exceptions: approved-phrases.json → banned_claim_exceptions.
export const BANNED = {
  any: [
    [/(?<![\d٠-٩])(100|١٠٠)\s?[%٪]/u, '« 100 % »'],
  ],
  fr: [
    [/(?<!\p{L})garanti(e|es|s)?(?!\p{L})/iu, '« garanti »'],
    [/0\s?%\s*d['’]\s?int[ée]r[êe]t/iu, '« 0 % d\'intérêt »'],
    [/sans\s+int[ée]r[êe]ts?/iu, '« sans intérêt »'],
    [/(derni[èe]res?|plus que \S+|seulement \S+)\s+places?/iu, 'fake urgency (places)'],
    [/places?\s+limit[ée]es?/iu, 'fake urgency (places limitées)'],
    [/d[ée]p[êe]chez[- ]vous|ne tardez pas|offre expire|compte à rebours|vite,? r[ée]servez/iu, 'fake urgency'],
    [/(wiki\s?tours|bab\s?makka)[^.!?]{0,60}(meilleur|n°\s?1|numéro 1|leader|le plus fiable|la plus fiable|incontournable)/iu, 'superlative about Wiki Tours'],
    [/(meilleur|n°\s?1|numéro 1|leader)[^.!?]{0,40}(wiki\s?tours|bab\s?makka)/iu, 'superlative about Wiki Tours'],
  ],
  ar: [
    [/مضمون/u, '« مضمون »'],
    [/(بدون|بلا|دون)\s+فوائد|(0|٠)\s?[%٪]\s*(من\s+)?(ال)?فائدة/u, '« 0 % فائدة »'],
    [/(آخر|اخر)\s+(المقاعد|الأماكن|الاماكن)|(مقاعد|أماكن|اماكن)\s+محدودة|سارعوا|سارع\s+بالحجز|العرض\s+ينتهي/u, 'fake urgency'],
    [/(wiki\s?tours|bab\s?makka)[^.!?؟]{0,60}(الأفضل|الافضل|رقم\s?1|الرائد)/iu, 'superlative about Wiki Tours'],
  ],
  en: [
    [/(?<!\p{L})guarantee(d|s)?(?!\p{L})/iu, '« guaranteed »'],
    [/0\s?%\s*interest|interest[- ]free/iu, '« 0% interest »'],
    [/(last|only \S+)\s+(seats|places|spots)|limited (seats|places|spots|availability)|(?<!\p{L})(seats|places|spots)(?!\p{L})([^.!?]{0,50}?\s(are|is|remain|remains))?\s+limited|hurry|book now before|offer ends|act now/iu, 'fake urgency'],
    [/(wiki\s?tours|bab\s?makka)[^.!?]{0,60}(best|number one|no\.?\s?1|leader|most trusted)/iu, 'superlative about Wiki Tours'],
  ],
};
const BANNED_ALL = Object.values(BANNED).flat();
const FORBIDDEN_LD = new Set(['LocalBusiness', 'TravelAgency', 'Event', 'HowTo', 'Review', 'AggregateRating']);
const LICENCE_PATTERNS = [/ODV[-\s]?\d+/i, /licen[cs]e\s+(n°|no\.?|number|numéro)/i, /agr[ée]ment\s+(n°|no\.?|numéro)/i];
const SINCE_PATTERN = /depuis\s+2016|since\s+2016|منذ\s+2016/i;
// Gate 4: religious text (Qur'an, hadith, du'a, talbiya) only through [[kb:id]] (rendered from data/facts/kb/, not gated).
const RELIGIOUS = [
  /[﴾﴿ﷺ]/u,
  /(?<!\p{L})(sourates?|surahs?|versets?|hadiths?|ḥadīths?|invocations?|supplications?|du['’]?as?|dou['’]?as?|douaa|talbiy[ae]h?|labbayk\p{L}*|coran|qur['’]?an|quran)(?!\p{L})/iu,
  /لبيك|قال الله|قال تعالى|قوله تعالى|صلى الله عليه وسلم|رواه|الحديث الشريف|حديث شريف|سورة|القرآن|دعاء|الدعاء|أدعية/u,
];
const ARABIC_RUN = /[\u0600-\u06FF]{2,}(?:[\s،]+[\u0600-\u06FF]{2,}){2,}/u; // 3+ Arabic words on a French/English page
// Gate 8: visa, Hajj and health rules need an official source (STRATEGY 7.4).
const REGULATED_TOPICS = new Set(['visa', 'health', 'hajj_process']);
const OFFICIAL_HOST = /(^|\.)(gov\.ma|gov\.sa|nusuk\.sa|habous\.gov\.ma|haj\.gov\.sa)$/;
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ---------- registry ----------
export function registryGate(project, add) {
  const seen = new Map(); // id -> file (data/facts/registry.json or data/facts/extra/*.json)
  for (const { file, facts } of project.registryFiles || [{ file: 'data/facts/registry.json', facts: project.registryList }]) {
    for (const f of facts) {
      if (seen.has(f.id)) add('error', 'registry', null, `duplicate fact id ${f.id} (${seen.get(f.id)} and ${file}): ids must be unique across registry files`);
      else seen.set(f.id, file);
      if (!validateFact(f)) add('error', 'registry', null, `${file}: ${f.id}: ${ajvMsg(validateFact.errors)}`);
    }
  }
  for (const msg of project.registryFiles?.overlayErrors || []) add('error', 'registry', null, msg);
  // Religious KB: valid entries, approved only by a real person listed in config/authors.json.
  const people = new Set(project.authors.map(a => a.id));
  for (const { _file, ...e } of project.kbList || []) {
    if (!validateKb(e)) { add('error', 'registry', null, `kb/${_file}: ${ajvMsg(validateKb.errors)}`); continue; }
    if (e.status === 'approved' && !people.has(e.approved_by)) add('error', 'registry', null, `kb/${_file}: approved_by "${e.approved_by}" is not a real person in config/authors.json`);
  }
}

// ---------- 1. front matter (all files, drafts included) ----------
export function frontmatterGate(project, all, add, today) {
  const authorIds = new Set(project.authors.map(a => a.id));
  const slugs = new Map(), homes = new Map(), tkeys = new Map();
  const langCodes = new Set([...project.sites.values()].flatMap(s => s.meta.languages));
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
    } else if (RESERVED_SLUGS.has(fm.slug) || langCodes.has(fm.slug)) add(level, 'frontmatter', p, `slug "${fm.slug}" is reserved`);
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
    // translation_key pairs one page per language on one site (hreflang, language switcher).
    if (fm.translation_key) {
      const tk = `${p.site}|${p.lang}|${fm.translation_key}`;
      if (tkeys.has(tk)) add('error', 'frontmatter', p, `translation_key "${fm.translation_key}" already used in ${p.lang} by ${tkeys.get(tk)} (one page per language)`);
      tkeys.set(tk, p.file);
    }
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
    const { errors } = factsGate(text, project.registry, { today, approvedPhrases: phrasesFor(project, p.site, p.lang) });
    for (const e of errors) {
      const stale = e.rule === 'fact-past-review' || e.rule === 'fact-expired';
      add(stale ? 'warning' : 'error', 'facts', p, `${field}: ${e.rule}${e.id ? ' ' + e.id : ''}${e.value ? ' value ' + e.value : ''}${e.status ? ' (status ' + e.status + ')' : ''}${e.sentence ? ' — « ' + e.sentence.slice(0, 140) + ' »' : ''}${stale ? ' (page shows « information en cours de mise à jour »)' : ''}`);
    }
    for (const e of requiredWordingGate(text, project.registry, p.lang)) add('error', 'facts', p, e.wording
      ? `${field}: ${e.id} must be written with its required wording « ${e.wording} » in the same sentence`
      : `${field}: ${e.id} has no ${p.lang} required wording in the registry yet (required_wording_${p.lang}): it cannot be cited on ${p.lang} pages`);
  }
  if (p.dropFromSitemap) add('warning', 'facts', p, 'a cited fact is more than 14 days past review_by: page is noindex and out of the sitemap until fixed');
}

// ---------- 5. entities ----------
// DECISIONS D-B: no named agency without legal_ok. Posts (auto-published) naming an unlisted agency-like entity are
// blocked while config/legal.json legal_ok is not true; hand-written pages get a warning.
function entityGate(project, p, add) {
  const allowed = project.entities.allowed.map(s => s.toLowerCase());
  const generic = new Set((project.entities.generic || []).map(s => s.toLowerCase()));
  // Names never span a line break (paragraphs, list items and table cells are separate lines in p.plain).
  const re = /(?:\b(?:agence|compagnie|soci[ée]t[ée])[ \u00A0]+((?:[A-Z][\p{L}'’-]+[ \u00A0]?){1,4}))|((?:[A-Z][\p{L}'’-]+[ \u00A0]){1,3}(?:Tours|Travel|Voyages|Airlines?|Airways|Aviation))/gu;
  const found = new Set();
  for (const m of p.plain.matchAll(re)) {
    const name = (m[1] || m[2]).trim();
    if (name.toLowerCase().split(/\s+/).every(w => generic.has(w))) continue; // « agence Omra » is not a name
    if (!allowed.some(a => name.toLowerCase().includes(a) || a.includes(name.toLowerCase()))) found.add(name);
  }
  const level = p.kind === 'posts' && project.legal.legal_ok !== true ? 'error' : 'warning';
  for (const n of found) add(level, 'entities', p, `« ${n} » is not on the allowed entity list (config/entities.json)${level === 'error' ? ': no named agency or company without legal_ok (DECISIONS D-B)' : ''}`);
}

// ---------- 6. cannibalisation (network-wide) ----------
// Pairs (a < b) to compare: every candidate pair, or (generator) only the pairs that involve a focus page: the other
// pairs are already in the baseline run, so a draft is compared with the network in O(n) instead of n².
function focusPairs(n, isFocus) {
  const out = [];
  for (let i = 0; i < n; i++) if (isFocus(i)) for (let j = 0; j < n; j++) if (j !== i && !(isFocus(j) && j < i)) out.push([Math.min(i, j), Math.max(i, j)]);
  return out;
}

function cannibalGate(project, pages, add, focus = null) {
  const reservedConcepts = new Set(project.targets.reserved_concepts.map(c => c.concept_id));
  const reservedKw = project.targets.reserved_keyword_patterns.map(s => new RegExp(s, 'i'));
  // Pages in publication order: the first page of a keyword, concept or cluster owns it and the error lands on the
  // newer page, whatever the order of sites in config/network.json. Same date: network order, then file path.
  const siteRank = new Map(project.network.sites.map((s, i) => [s.domain, i]));
  const art = pages.filter(p => p.fm.primary_keyword)
    .sort((a, b) => String(a.fm.date).localeCompare(String(b.fm.date)) || (siteRank.get(a.site) ?? 0) - (siteRank.get(b.site) ?? 0)
      || String(a.file).localeCompare(String(b.file)));
  const byKey = new Map(), byConcept = new Map(), clusterOwner = new Map();
  for (const p of art) {
    const fm = p.fm;
    if (reservedConcepts.has(fm.concept_id)) add('error', 'cannibalisation', p, `concept "${fm.concept_id}" is reserved for wikitours.ma`);
    if (reservedKw.some(r => r.test(stripMarkers(fm.primary_keyword)))) add('error', 'cannibalisation', p, `primary keyword "${fm.primary_keyword}" matches a wikitours.ma-reserved topic`);
    const k = `${p.lang}|${matchKey(fm.primary_keyword)}`;
    if (byKey.has(k)) add('error', 'cannibalisation', p, `same primary keyword as ${byKey.get(k).absUrl}`); else byKey.set(k, p);
    // DECISIONS D-H: a concept stays on one site in every language, and once per language.
    const prev = byConcept.get(fm.concept_id) || [];
    const clash = prev.find(o => o.site !== p.site) || prev.find(o => o.lang === p.lang);
    if (clash) add('error', 'cannibalisation', p, `concept "${fm.concept_id}" already served by ${clash.absUrl} (${clash.site !== p.site ? `owned by another site: ${clash.site}, since ${clash.fm.date}` : 'same language: update that page instead'})`);
    else byConcept.set(fm.concept_id, [...prev, p]);   // a rejected page never becomes an owner
    const owner = clusterOwner.get(fm.cluster);
    if (owner && owner !== p.site) add('error', 'cannibalisation', p, `cluster "${fm.cluster}" belongs to ${owner}`); else clusterOwner.set(fm.cluster, p.site);
  }
  // Title tokens once per page; candidate pairs through prefix filtering (no n² comparisons).
  for (const lang of new Set(art.map(p => p.lang))) {
    const list = art.filter(p => p.lang === lang);
    const sets = list.map(p => new Set(matchKey(stripMarkers(p.fm.title)).split(' ').filter(Boolean)));
    const pairs = focus ? focusPairs(list.length, i => focus.has(list[i])).map(([a, b]) => ({ a, b, score: jaccard(sets[a], sets[b]) })).filter(x => x.score >= LIMITS.titleJaccard)
      : similarSetPairs(sets, LIMITS.titleJaccard);
    for (const { a, b, score } of pairs) add('error', 'cannibalisation', list[b], `title too close (${score.toFixed(2)}) to ${list[a].absUrl}`);
  }
}

// ---------- 7. duplicate (network-wide, all pages incl. trust; template text already stripped) ----------
export function duplicateGate(pages, add, focus = null) {
  const feats = pages.map(p => (p.features ??= docFeatures(p.plain))); // cached per text (similarity.js)
  const docs = feats.map((f, i) => ({ id: i, shingles: f.shingles5 }));
  if (focus) {
    for (const [a, b] of focusPairs(pages.length, i => focus.has(pages[i]))) {
      const score = jaccard(feats[a].shingles5, feats[b].shingles5);
      if (score >= LIMITS.dupWarn) add(score >= LIMITS.dupBlock ? 'error' : 'warning', 'duplicate', pages[b], `5-shingle Jaccard ${score.toFixed(2)} vs ${pages[a].absUrl}`);
      const d = hamming(feats[a].simhash, feats[b].simhash);
      if (feats[a].words >= LIMITS.simhashMinWords && feats[b].words >= LIMITS.simhashMinWords && d <= LIMITS.simhashBlock) add('error', 'duplicate', pages[b], `SimHash distance ${d} vs ${pages[a].absUrl}`);
    }
    return;
  }
  for (const { a, b, score } of similarPairs(docs, LIMITS.dupWarn)) {
    const pa = pages[a], pb = pages[b];
    add(score >= LIMITS.dupBlock ? 'error' : 'warning', 'duplicate', pb, `5-shingle Jaccard ${score.toFixed(2)} vs ${pa.absUrl}`);
  }
  const hashed = feats.map((f, i) => ({ i, n: f.words, h: f.simhash })).filter(x => x.n >= LIMITS.simhashMinWords);
  // Band buckets: only hashes that share a 16-bit band can be within the distance (pigeonhole), see similarity.js.
  for (const [x, y] of simhashBuckets(hashed.map(o => o.h), LIMITS.simhashBlock)) {
    const d = hamming(hashed[x].h, hashed[y].h);
    if (d <= LIMITS.simhashBlock) add('error', 'duplicate', pages[hashed[y].i], `SimHash distance ${d} vs ${pages[hashed[x].i].absUrl}`);
  }
}

// ---------- 9. links ----------
// Every <a href> of an HTML string, whatever the quote style.
export const hrefs = html => [...html.matchAll(/<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)].map(m => ({ href: (m[1] ?? m[2] ?? m[3]).replace(/&amp;/g, '&'), tag: m[0] }));
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
    for (const w of p.linkWarnings || []) add('warning', 'links', p, w);
    const flows = new Set(project.sites.get(p.site).meta.flows || []);
    // Only links to pages in the post's own language count toward the minimum (a [[link:...]] that falls back to a
    // base-language page, or a raw /contact/ link on an Arabic page, still renders but does not count).
    const hrefLang = hrefLangOf(project);
    const sameAll = p.links.filter(l => l.kind === 'same' && l.where === 'body');
    const same = sameAll.filter(l => (l.target?.lang ?? hrefLang(l.href)) === p.lang);
    let crossLang = sameAll.length - same.length;
    const sister = p.links.filter(l => l.kind === 'sister');
    const wt = p.links.filter(l => l.kind === 'wt');
    // raw Markdown links: internal ones count as same-site; network / wikitours ones are not allowed.
    let rawInternal = 0;
    for (const { href, tag } of hrefs(p.bodyHtml)) {
      if (href.startsWith('#') || /class="(cta__button|network-link)"/.test(tag)) continue;
      if (href.startsWith('/')) { if (!sameAll.some(l => l.href === href)) { if (hrefLang(href) === p.lang) rawInternal++; else crossLang++; } continue; }
      let host; try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { continue; }
      if (host === 'wa.me') continue;
      if (host === p.site) add('error', 'links', p, `absolute link to this site (${href}): use [[link:slug|anchor]]`);
      else if (host === 'wikitours.ma' && !/class="wt-link"/.test(tag)) add('error', 'links', p, `raw link to wikitours.ma (${href}): use [[wt:target|anchor]]`);
      else if (domains.has(host) && !sister.some(l => l.href === href)) add('error', 'links', p, `raw link to a sister site (${href}): use [[site:domain/slug|anchor]]`);
      if (host === 'wikitours.ma' && policy.money_link_rel && !new RegExp(`rel="[^"]*${policy.money_link_rel}`).test(tag)) add('error', 'links', p, `wikitours.ma link without rel="${policy.money_link_rel}"`);
    }
    if (p.kind === 'posts' && same.length + rawInternal < policy.min_same_site_links_per_post)
      add('error', 'links', p, `${same.length + rawInternal} same-site links in the body, posts need ≥ ${policy.min_same_site_links_per_post}`
        + (crossLang ? ` (${crossLang} link(s) to pages in another language do not count: write the ${p.lang} page or link another ${p.lang} page)` : ''));
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
    const s = perSite.get(p.site) || { posts: 0, withWt: 0, wt: 0, brand: 0, wtPosts: [], anchors: new Map() };
    if (p.kind === 'posts') { s.posts++; if (wt.length) { s.withWt++; s.wtPosts.push(p); } }
    s.wt += wt.length; s.brand += wt.filter(l => brand.some(r => r.test(l.anchor))).length;
    for (const l of wt) {
      const a = s.anchors.get(l.href) || new Map();
      a.set(l.anchor.toLowerCase(), (a.get(l.anchor.toLowerCase()) || 0) + 1);
      s.anchors.set(l.href, a);
    }
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
    // STRATEGY 3.5 / 8.2 share cap: blocks the newest post with a wikitours.ma link (the generator drops the link).
    if (cap != null && s.posts >= 5 && s.withWt / s.posts > cap) {
      const newest = s.wtPosts.sort((a, b) => a.fm.date.localeCompare(b.fm.date) || a.fm.slug.localeCompare(b.fm.slug)).pop();
      add('error', 'links', newest, `posts linking to wikitours.ma would exceed the site cap of ${Math.round(cap * 100)}%: remove this link`);
    }
    for (const [href, anchors] of s.anchors) {
      const total = [...anchors.values()].reduce((x, y) => x + y, 0);
      for (const [anchor, n] of anchors) if (total >= 5 && n / total > 0.2) add('warning', 'links', { site }, `anchor « ${anchor} » is ${Math.round(100 * n / total)}% of the links to ${href} (target ≤ 20%)`);
    }
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
      for (const m of content.matchAll(/\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        let href = (m[1] ?? m[2]).replace(/&amp;/g, '&');
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
  const cited = p.factsUsed.map(id => project.registry[id]).filter(Boolean);
  const regulated = [...new Set(cited.filter(f => REGULATED_TOPICS.has(f.topic)).map(f => f.topic))];
  if (regulated.length && !cited.some(f => f.source_tier === 'official') && !p.sources.some(s => OFFICIAL_HOST.test(hostOf(s.url))))
    add('error', 'citations', p, `${regulated.join(', ')} rules need at least one official source (habous.gov.ma, haj.gov.sa, Nusuk…): every cited fact is ${[...new Set(cited.map(f => f.source_tier))].join('/')}`);
  // Site rule (config/network.json required_fact_topics, e.g. omracasablanca.ma: a verified Casablanca-specific fact).
  const need = project.sites.get(p.site).meta.required_fact_topics;
  if (need?.length && p.kind === 'posts' && !cited.some(f => f.status === 'approved' && need.includes(f.topic)))
    add('error', 'citations', p, `posts on ${p.site} must cite an approved fact with topic ${need.join(' or ')} (DECISIONS D-B)`);
  // 10. disclosure
  const mentions = MENTION.test([fm.title, fm.description, p.plain, ...(fm.faq || []).flatMap(f => [f.q, f.a])].join(' ')) || p.links.some(l => l.kind === 'wt');
  if (mentions && !(p.disclosed && p.html.includes('box--disclosure'))) add('error', 'disclosure', p, 'mentions or links Wiki Tours / Bab Makka without the disclosure box');
  // 12. meta lengths (uniqueness is network-wide below)
  // Same limits in every language, counted in graphemes (an Arabic letter with its vowel marks is one character).
  const tl = graphemes(title), dl = graphemes(desc);
  if (tl < LIMITS.titleMin || tl > LIMITS.titleMax) add('error', 'meta', p, `title is ${tl} characters (${LIMITS.titleMin}-${LIMITS.titleMax})`);
  if (dl < LIMITS.descMin || dl > LIMITS.descMax) add('error', 'meta', p, `description is ${dl} characters (${LIMITS.descMin}-${LIMITS.descMax})`);
  // 13. stale year in title / H1. Blocking only for pages written or updated in the current season (new drafts);
  // the yearly season flip (1 June) turns older pages into a warning to fix, never a network-wide stop.
  const seasonStart = `${seasonYear - 1}-06-01`;
  const evergreen = EVERGREEN.has(fm.type) || p.kind === 'posts' && !['news', 'data'].includes(fm.type);
  for (const y of (title.match(/(?<!\d)20\d\d(?!\d)/g) || []).map(Number))
    if (y < seasonYear) add(evergreen && (fm.updated || fm.date) >= seasonStart ? 'error' : 'warning', 'stale-year', p, `year ${y} in title < season ${seasonYear}`);
  // 14. banned claims
  const exceptions = project.phrases.banned_claim_exceptions || [];
  let text = [title, desc, p.plain, ...(fm.faq || []).flatMap(f => [stripMarkers(f.q), stripMarkers(f.a)])].join('\n');
  for (const e of exceptions) text = text.split(e).join(' ');
  for (const [re, label] of BANNED_ALL) if (re.test(text)) add('error', 'banned-claim', p, `banned claim ${label}: « ${(text.match(re) || [''])[0]} »`);
  // 16. unknowns section
  if (UNKNOWN_REQUIRED.has(fm.type) && !p.hasUnknown) add('error', 'unknowns', p, `${fm.type} pages need a :::unknown section`);
  // Answer-first template (STRATEGY 7.3): a :::answer box of 40-60 words on posts.
  if (p.kind === 'posts' && (p.answerWords == null || p.answerWords < 40 || p.answerWords > 60))
    add('warning', 'answer', p, p.answerWords == null ? 'no :::answer box (STRATEGY 7.3)' : `:::answer box has ${p.answerWords} words (40-60)`);
  // Raw HTML is never rendered (escaped) and never allowed: no script, handler or untracked link can slip in.
  for (const h of p.rawHtml || []) add('error', 'html', p, `raw HTML in Markdown is not allowed: « ${h} » (use Markdown and shortcodes)`);
  // 4. religious text only from the approved KB ([[kb:id]]); nothing else may quote or name such texts.
  const religious = [title, desc, stripMarkers(fm.summary), p.plain, ...(p.faqRendered || []).flatMap(f => [f.q, plainText(f.aHtml)])].join('\n');
  const hit = RELIGIOUS.map(r => religious.match(r)?.[0]).find(Boolean) || (p.lang !== 'ar' && religious.match(ARABIC_RUN)?.[0]);
  if (hit) add('error', 'religious-text', p, `religious text or reference « ${hit.slice(0, 60)} » outside [[kb:id]]: only approved entries of data/facts/kb/ may appear (gate 4)`);
  // editorial word floors (STRATEGY 7.3; not a ranking rule) and images
  const floor = WORD_FLOORS[fm.type];
  const wc = (p.features ??= docFeatures(p.plain)).words;
  if (floor && wc < floor) add('warning', 'word-floor', p, `${wc} words < editorial floor ${floor} for ${fm.type}`);
  for (const im of p.images) if (!im.alt?.trim()) add('warning', 'images', p, `image without alt text: ${im.src}`);
}

// Every @type value in a JSON-LD tree (string or array members, at any depth).
export function ldTypes(node, out = []) {
  if (Array.isArray(node)) for (const x of node) ldTypes(x, out);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
    if (k === '@type') out.push(...[v].flat().filter(t => typeof t === 'string'));
    else ldTypes(v, out);
  }
  return out;
}

// JSON-LD parses, no forbidden types, one H1, lang/dir and self-canonical on every HTML output.
function htmlGates(project, outputs, add) {
  for (const [domain, files] of outputs) for (const [file, html] of files) {
    if (!file.endsWith('.html')) continue;
    const where = { site: domain, url: '/' + file.replace(/index\.html$/, '') };
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) add('error', 'meta', where, `${h1} <h1> elements (exactly 1 expected)`);
    const lm = html.match(/<html lang="([^"]+)" dir="(ltr|rtl)"/);
    const li = lm && Object.values(LANGS).find(l => l.html === lm[1]);
    if (!li || li.dir !== lm[2]) add('error', 'meta', where, 'missing or wrong lang/dir on <html> (fr-MA ltr, ar-MA rtl, en ltr)');
    if (file !== '404.html' && !html.includes(`<link rel="canonical" href="https://${domain}${where.url}">`)) add('error', 'meta', where, 'missing self-canonical');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data; try { data = JSON.parse(m[1]); } catch (e) { add('error', 'schema', where, `JSON-LD does not parse: ${e.message}`); continue; }
      for (const t of ldTypes(data)) if (FORBIDDEN_LD.has(t)) add('error', 'schema', where, `forbidden JSON-LD type ${t} on a satellite`);
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
    const tl = graphemes(g.title), dl = graphemes(g.description);
    if (tl > LIMITS.titleMax) add('warning', 'meta', { site: g.site, url: g.url }, `generated title is ${tl} characters`);
    if (dl < LIMITS.descMin || dl > LIMITS.descMax) add('warning', 'meta', { site: g.site, url: g.url }, `generated description is ${dl} characters (set blog.description in config/sites)`);
  }
}

export const seasonYearOf = today => { const y = Number(today.slice(0, 4)); return today.slice(5) >= '06-01' ? y + 1 : y; };

// Runs every post-render gate. state = { project, pages, generated, outputs, today, add, focus? }
// focus (generator drafts): Set of pages; the pairwise gates then only compare those pages with the network.
// Language of a same-site path: /ar/... -> ar, /en/... -> en, anything else -> the base language.
function hrefLangOf(project) {
  const base = project.network.base_lang || 'fr';
  const prefixed = Object.keys(LANGS).filter(l => l !== base).map(l => [l, langPrefix(project, l)]).filter(([, pre]) => pre);
  return href => prefixed.find(([, pre]) => href === pre || href.startsWith(pre + '/'))?.[0] ?? base;
}

// Per-language site chrome (D-H): every language that has a home page needs its own footer nav (trust links: error),
// header nav, tagline, WhatsApp topic and, when it has posts, a blog description (warnings), plus an « éditeur » and a
// « contact » page written in that language (warning: until they exist the byline, CTA and links fall back to the
// base-language pages).
export function siteLanguageGate(project, pages, add) {
  for (const site of project.sites.values()) {
    for (const lang of site.meta.languages || []) {
      const own = pages.filter(p => p.site === site.domain && p.lang === lang);
      if (!own.some(p => p.fm.type === 'home')) continue;
      const where = { site: site.domain, url: `${langPrefix(project, lang)}/` };
      const cfg = `config/sites/${site.domain}.json`;
      if (!navFor(project, site.config.footer_nav, lang).length)
        add('error', 'site-config', where, `${lang}: footer_nav has no ${lang} entries (${cfg} → footer_nav.${lang}): the footer would have no trust links`);
      if (!navFor(project, site.config.nav, lang).length)
        add('warning', 'site-config', where, `${lang}: nav has no ${lang} entries (${cfg} → nav.${lang}): the header would have no navigation`);
      if (!forLang(project, site.config.tagline, lang)) add('warning', 'site-config', where, `${lang}: no tagline for this language (${cfg} → tagline.${lang})`);
      if (!forLang(project, site.config.whatsapp?.default_topic, lang))
        add('warning', 'site-config', where, `${lang}: no WhatsApp topic for this language (${cfg} → whatsapp.default_topic.${lang})`);
      if (own.some(p => p.kind === 'posts') && !forLang(project, site.config.blog, lang)?.description)
        add('warning', 'site-config', where, `${lang}: no blog description for this language (${cfg} → blog.${lang}.description)`);
      for (const slug of ['editeur', 'contact'])
        if (!own.some(p => p.kind === 'pages' && p.fm.slug === slug))
          add('warning', 'site-config', where, `${lang}: no « ${slug} » page in this language (content/${site.domain}/${lang}/pages/${slug}.md): the byline, CTA, footer and [[link:${slug}]] fall back to the base-language page`);
    }
  }
}

export function runGates({ project, pages, generated, outputs, today, add, focus = null }) {
  const seasonYear = seasonYearOf(today);
  for (const p of pages) {
    factsGateForPage(project, p, add, today);
    entityGate(project, p, add);
    pageGates(project, p, add, today, seasonYear);
  }
  cannibalGate(project, pages, add, focus);
  // Duplicate checks compare pages of the same language only (D-H: languages are written separately, never mirrored).
  for (const lang of new Set(pages.map(p => p.lang))) duplicateGate(pages.filter(p => p.lang === lang), add, focus);
  linksGate(project, pages, add);
  siteLanguageGate(project, pages, add);
  resolutionGate(project, outputs, pages, add);
  metaUniqueness(pages, generated, add);
  htmlGates(project, outputs, add);
  for (const site of project.sites.values())
    if (!site.config.whatsapp?.number && pages.some(p => p.site === site.domain))
      add('warning', 'whatsapp', { site: site.domain }, 'whatsapp.number is null: CTAs link to the contact page until the client provides the number (STRATEGY 2.1 A5)');
}

export { ARTICLE_TYPES };
