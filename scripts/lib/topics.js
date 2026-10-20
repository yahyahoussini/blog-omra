// Topic queue (content/<domain>/topics.json): fact eligibility, network conflicts, selection.
import fs from 'node:fs';
import { readJSON, writeJSON, addDays, paths } from './common.js';
import { matchKey } from '../../engine/lib/normalize.js';
import { jaccard } from '../../engine/lib/similarity.js';
import { stripMarkers } from '../../engine/lib/util.js';
import { wordingFor } from '../../engine/lib/facts-gate.js';

export const POST_TYPES = ['guide', 'explainer', 'checklist', 'local', 'data', 'news'];
export const TOPIC_STATUSES = ['queued', 'done', 'failed', 'blocked'];

export const loadTopics = (root, domain) => readJSON(paths(root).topics(domain), []);
export const saveTopics = (root, domain, topics) => writeJSON(paths(root).topics(domain), topics);

// ASCII slug without years (slugs must stay evergreen). Falls back to the topic id.
export function slugify(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').split('-').filter(t => t && !/^(19|20|14)\d\d$/.test(t)).join('-').slice(0, 75).replace(/-+$/, '');
}
export const topicSlug = t => t.slug || slugify(t.primary_keyword) || slugify(t.id);
export const topicLang = t => t.lang || 'fr';

// 'ok' or the reason a fact cannot be used for a new post today (in `lang`: a fact with required_wording needs
// that wording in the page language, see facts-gate.js wordingFor).
export function factState(fact, today, minDaysLeft = 0, lang = 'fr') {
  if (!fact) return 'unknown';
  if (fact.status !== 'approved') return `not approved (${fact.status})`;
  if (fact.required_wording && !wordingFor(fact, lang)) return `no ${lang} required wording yet (required_wording_${lang})`;
  const horizon = addDays(today, minDaysLeft);
  for (const k of ['review_by', 'valid_until']) {
    if (fact[k] && fact[k] < today) return `past ${k} ${fact[k]}`;
    if (fact[k] && fact[k] < horizon) return `${k} ${fact[k]} within ${minDaysLeft} days`;
  }
  return 'ok';
}

export function factProblems(topic, registry, today, minDaysLeft) {
  return (topic.facts_needed || []).map(id => ({ id, state: factState(registry[id], today, minDaysLeft, topicLang(topic)) })).filter(x => x.state !== 'ok');
}

// Ritual topics carry Qur'an / du'a / talbiya text: they wait until the religious KB (data/facts/kb/) has approved entries.
export const RITUAL_TOPIC = /(?<!\p{L})(ihram|tawaf|tawâf|sa['’]?y|sa['’]?i|talbiy\p{L}*|du['’]?as?|dou['’]?as?|douaa|invocations?|supplications?|prières?|priere\p{L}*|salat|rituel\p{L}*|ritual\p{L}*|rites?|coran|qur['’]?an|quran|hadiths?|zamzam|arafat|mina|muzdalifa\p{L}*|lapidation|jamarat|إحرام|طواف|سعي|تلبية|دعاء|أدعية|مناسك|صلاة|القرآن)(?!\p{L})/iu;
const REGULATED = new Set(['visa', 'health', 'hajj_process']);

// Engine rules a topic would fail whatever the draft says (gates 4 and 8, site rules). [] = none.
export function topicRuleProblems(topic, project) {
  const out = [];
  const facts = (topic.facts_needed || []).map(id => project.registry[id]).filter(Boolean);
  const text = [topic.title, topic.primary_keyword, topic.concept_id?.replace(/_/g, ' ')].join(' ');
  if (!Object.values(project.kb || {}).some(e => e.status === 'approved') && RITUAL_TOPIC.test(text))
    out.push('ritual topic: waits for approved religious texts in data/facts/kb/ (gate 4)');
  const regulated = [...new Set(facts.filter(f => REGULATED.has(f.topic)).map(f => f.topic))];
  if (regulated.length && !facts.some(f => f.source_tier === 'official'))
    out.push(`${regulated.join(', ')} rules need an official-source fact (gate 8): add one to facts_needed when the registry has it`);
  const need = project.sites.get(topic.site)?.meta.required_fact_topics;
  if (need?.length && !facts.some(f => need.includes(f.topic))) out.push(`${topic.site} posts must cite a ${need.join('/')} fact`);
  return out;
}

// What already exists in the network, for conflict checks. Items: { site, lang, title, primary_keyword, cluster, concept_id, ref }.
export function networkItems(content, topicsBySite = {}) {
  const items = [];
  for (const p of content) {
    if (p.fm.status === 'retired' || !p.fm.primary_keyword) continue;
    items.push({ site: p.site, lang: p.lang, title: stripMarkers(p.fm.title || ''), primary_keyword: p.fm.primary_keyword, cluster: p.fm.cluster, concept_id: p.fm.concept_id, slug: p.fm.slug, ref: p.file, kind: 'content' });
  }
  for (const [site, list] of Object.entries(topicsBySite)) for (const t of list) {
    if (t.status === 'failed') continue;
    items.push({ site, lang: topicLang(t), title: t.title, primary_keyword: t.primary_keyword, cluster: t.cluster, concept_id: t.concept_id, slug: topicSlug(t), ref: `topic ${t.id}`, kind: 'topic', id: t.id, status: t.status });
  }
  return items;
}

const titleTokens = s => new Set(matchKey(s).split(' ').filter(Boolean));

/**
 * Network conflicts for a topic on `site` (cannibalisation guard, STRATEGY 6.5 + DECISIONS D-H).
 * `items` = networkItems(...) without the topic itself. Returns a list of reasons (empty = no conflict).
 */
export function topicConflicts(topic, site, items, project, { titleJaccard = 0.6 } = {}) {
  const reasons = [];
  const lang = topicLang(topic);
  const reservedConcepts = new Set(project.targets.reserved_concepts.map(c => c.concept_id));
  const reservedKw = project.targets.reserved_keyword_patterns.map(s => new RegExp(s, 'i'));
  if (reservedConcepts.has(topic.concept_id)) reasons.push(`concept "${topic.concept_id}" is reserved for wikitours.ma`);
  if (reservedKw.some(r => r.test(topic.primary_keyword || '') || r.test(topic.title || ''))) reasons.push(`"${topic.primary_keyword}" matches a wikitours.ma-reserved topic`);
  const key = matchKey(topic.primary_keyword || '');
  const tt = titleTokens(topic.title || '');
  const slug = topicSlug(topic);
  for (const o of items) {
    if (o.concept_id === topic.concept_id && o.site !== site) reasons.push(`concept "${topic.concept_id}" is owned by ${o.site} (${o.ref})`);
    else if (o.concept_id === topic.concept_id && o.lang === lang) reasons.push(`concept "${topic.concept_id}" already served in ${lang} by ${o.ref}`);
    if (o.cluster && o.cluster === topic.cluster && o.site !== site) reasons.push(`cluster "${topic.cluster}" belongs to ${o.site}`);
    if (o.lang !== lang) continue;
    if (key && matchKey(o.primary_keyword || '') === key) reasons.push(`same primary keyword as ${o.ref} (${o.site})`);
    const s = jaccard(tt, titleTokens(o.title || ''));
    if (s >= titleJaccard) reasons.push(`title too close (${s.toFixed(2)}) to ${o.ref} (${o.site})`);
    if (o.site === site && o.slug === slug) reasons.push(`slug "${slug}" already used by ${o.ref}`);
  }
  return [...new Set(reasons)];
}

/**
 * Picks today's topics for one site.
 * @returns {{ selected: object[], skipped: {id:string, reason:string}[] }}
 */
// langPlan (optional, cadence.js languagePlan): today's languages in order. Topics of planned languages are taken
// first; a planned language with no eligible topic gives its slot to another active language that still has room
// (langSlots), so a site never idles while one language's queue is empty.
export function selectTopics({ topics, site, project, items, today, minFactDays = 0, quota, langSlots, activeLangs, langPlan = null }) {
  const selected = [], skipped = [];
  const used = {};
  const planned = {};
  for (const l of langPlan || []) planned[l] = (planned[l] || 0) + 1;
  const pass = (t, fallback) => {
    if (t.status !== 'queued' || selected.includes(t)) return;
    if (selected.length >= quota) return;
    const lang = topicLang(t);
    if (!activeLangs.has(lang)) { if (!fallback) skipped.push({ id: t.id, reason: `no published ${lang} home page on ${site} yet` }); return; }
    if ((used[lang] || 0) >= langSlots(lang)) { if (!fallback) skipped.push({ id: t.id, reason: `daily ${lang} slot used (DECISIONS D-H)` }); return; }
    if (langPlan && !fallback && (used[lang] || 0) >= (planned[lang] || 0)) { skipped.push({ id: t.id, reason: `not ${lang}'s turn today (languages rotate during the ramp, DECISIONS D-H)` }); return; }
    const reason = eligibility(t, lang);
    if (reason) { const prev = skipped.find(x => x.id === t.id); if (prev) prev.reason = reason; else skipped.push({ id: t.id, reason }); return; }
    used[lang] = (used[lang] || 0) + 1;
    selected.push(t);
  };
  for (const t of topics) pass(t, false);
  if (langPlan && selected.length < quota) for (const t of topics) pass(t, true);
  if (langPlan) for (const t of selected) { const i = skipped.findIndex(s => s.id === t.id); if (i >= 0) skipped.splice(i, 1); }
  return { selected, skipped };

  function eligibility(t, lang) {
    if (!POST_TYPES.includes(t.type)) return `type "${t.type}" is not a generated post type (${POST_TYPES.join(', ')})`;
    const missing = ['id', 'title', 'primary_keyword', 'cluster', 'concept_id'].filter(k => !t[k]);
    if (missing.length) return `missing fields: ${missing.join(', ')}`;
    if (!(t.facts_needed || []).length) return 'no facts_needed: a post needs at least one registry fact to cite';
    const bad = factProblems(t, project.registry, today, minFactDays);
    if (bad.length) return `facts not usable: ${bad.map(b => `${b.id} ${b.state}`).join('; ')}`;
    const rules = topicRuleProblems({ ...t, site }, project);
    if (rules.length) return rules.join('; ');
    // Published or drafted content is the truth here; planned topics were checked when they were planned.
    const conflicts = topicConflicts(t, site, items.filter(o => o.kind === 'content'), project);
    if (conflicts.length) return `conflict: ${conflicts.join('; ')}`;
    return null;
  }
}

// Languages with a published home page on a site (DECISIONS D-H: nothing builds in a language before its home page).
export function activeLanguages(content, site) {
  return new Set(content.filter(p => p.site === site && p.fm.type === 'home' && p.fm.status === 'published').map(p => p.lang));
}

// Post counts for the cadence: today, this ISO week, today per language (retired posts excluded).
export function postCounts(content, site, today, week) {
  const posts = content.filter(p => p.site === site && p.kind === 'posts' && p.fm.status !== 'retired');
  const byLang = {};
  for (const p of posts.filter(p => p.fm.date === today)) byLang[p.lang] = (byLang[p.lang] || 0) + 1;
  return {
    today: posts.filter(p => p.fm.date === today).length,
    week: posts.filter(p => p.fm.date >= week.monday && p.fm.date <= week.sunday).length,
    todayByLang: byLang,
  };
}

export const topicsFileExists = (root, domain) => fs.existsSync(paths(root).topics(domain));
