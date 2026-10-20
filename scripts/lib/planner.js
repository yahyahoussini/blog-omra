// Weekly topic planner: keeps each site's queue at ~30 days of its current quota with unique, fact-backed topics.
import path from 'node:path';
import { loadProject } from '../../engine/lib/config.js';
import { loadContent } from '../../engine/lib/content.js';
import { matchKey } from '../../engine/lib/normalize.js';
import { stripMarkers } from '../../engine/lib/util.js';
import { readJSON, writeJSON, appendJSONL, paths } from './common.js';
import { planningPerDay, addSpend, spendStatus } from './cadence.js';
import { loadTopics, saveTopics, networkItems, topicConflicts, factProblems, topicRuleProblems, activeLanguages, slugify, topicLang, POST_TYPES } from './topics.js';
import { addMissingCandidates } from './generator.js';
import { apiUnavailable, makeClient, callClaude, checkStop, SkipTopicError } from './claude.js';
import { ingestSemrush } from './semrush.js';

const MIN_FACTS = { guide: 2, news: 2, data: 2 };
// How each language searches (planning hints, not data: real volumes come only from the keyword registry).
export const LANG_GUIDANCE = {
  fr: 'French queries typed in Morocco: « omra », « prix omra », « visa omra », Moroccan cities and institutions (ONDA, ministère des Habous), dirhams. Moroccan French, not France French.',
  ar: 'Arabic queries typed in Morocco and the Arab world, in Modern Standard Arabic (« عمرة », « تأشيرة العمرة », « مواعيد العمرة », « الحج »). Questions are often phrased as « كيف », « متى », « شروط ». Plan from Arabic search intent, not from the French topics.',
  en: 'English queries from Moroccans abroad, international residents in Morocco and English-speaking pilgrims flying from Morocco (« Umrah from Morocco », « Umrah visa », « Hajj Morocco »). Plain international English.',
};
const id_ = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

export const PROPOSAL_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['topics'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'slug', 'primary_keyword', 'cluster', 'concept_id', 'type', 'angle', 'outline', 'facts_needed', 'missing_facts', 'internal_links', 'sister_links', 'wt_target', 'cta_topic', 'notes'],
        properties: {
          title: { type: 'string' }, slug: { type: 'string' }, primary_keyword: { type: 'string' },
          cluster: { type: 'string' }, concept_id: { type: 'string' }, type: { type: 'string', enum: POST_TYPES },
          angle: { type: 'string' }, outline: { type: 'array', items: { type: 'string' } },
          facts_needed: { type: 'array', items: { type: 'string' } }, missing_facts: { type: 'array', items: { type: 'string' } },
          internal_links: { type: 'array', items: { type: 'string' } },
          sister_links: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['site', 'slug'], properties: { site: { type: 'string' }, slug: { type: 'string' } } } },
          wt_target: { type: 'string' }, cta_topic: { type: 'string' }, notes: { type: 'string' },
        },
      },
    },
  },
};

export const PLANNER_SYSTEM = [
  'You plan blog topics for one site of a Moroccan Omra/Hajj information network published by Wiki Tours International (a licensed travel agency in Casablanca).',
  'Each topic must answer one real search intent of Moroccan pilgrims and their families, inside the site\'s charter, and must not overlap anything that already exists in the network.',
  'Rules:',
  '- Stay inside "owns"; never touch "never", "banned_concepts" or the reserved wikitours.ma concepts, in any language.',
  '- One concept_id = one search intent. It must be new: not in existing_concepts for any site. cluster groups several topics of THIS site; reuse this site\'s clusters when they fit, never another site\'s.',
  '- primary_keyword: the query a Moroccan reader would type, in the requested language, without a year. Do not invent search volumes.',
  '- facts_needed: ids from approved_facts only. A topic needs at least one fact (two for guide, news and data). If the topic needs a fact that is not in the list, describe it in missing_facts (the topic will wait for a human to add it).',
  '- No prices, dates or rules in titles unless an approved fact carries them. No religious rulings, no Qur\'an or hadith text, no named agencies, no rankings.',
  '- While approved_religious_texts is 0, propose no ritual topic (ihram, tawaf, sa\'y, talbiya, du\'a, prayers, Hajj rites): they need approved texts first.',
  '- A topic stating visa, health or Hajj-procedure rules needs at least one approved fact with source_tier "official" in facts_needed.',
  '- slug: short ASCII words separated by hyphens, no year. internal_links: slugs from site_pages. sister_links: only from sister_pages. wt_target: an id from wikitours_targets when a link to the publisher helps the reader, else "".',
  '- Titles 20-70 characters, all different in wording from existing titles.',
  '- Language (DECISIONS D-H): plan ONLY for the requested language, from how people search in THAT language (language_guidance). Title and primary_keyword are written natively in that language. Never propose a translation of a page or topic that exists in another language: the same intent may exist in two languages only when readers of both languages genuinely search for it, and then it keeps the same concept_id on this site (a concept never moves to another site).',
  '- concept_id may repeat across languages only on this site and only once per language; primary_keyword must be unique in its language across the network.',
  'Return the JSON object only.',
].join('\n');

/**
 * @param {object} o  { root, today, site?, dryRun?, proposeFn?, env?, log? }
 * proposeFn({system, messages, format}) => {text, usage, stopReason}
 */
export async function runPlan({ root, today, site: onlySite = null, dryRun = false, proposeFn = null, env = process.env, log = console.log }) {
  const p = paths(root);
  const summary = { ingest: null, unblocked: 0, requested: [], added: [], rejected: [], stopped: null };
  const project = await loadProject(root);
  const domains = [...project.sites.keys()];

  // 1. Semrush CSVs -> keyword registry (local, no API).
  summary.ingest = ingestSemrush({ rawDir: p.semrushRaw, registryFile: p.keywords, referenceDir: path.join(path.dirname(p.keywords), 'reference'), sites: domains, reservedPatterns: project.targets.reserved_keyword_patterns });
  if (summary.ingest.files) log(`semrush: ${summary.ingest.files} file(s), ${summary.ingest.keywords} keywords in the registry${summary.ingest.errors.length ? `, errors: ${summary.ingest.errors.join(' | ')}` : ''}`);
  else log('semrush: no CSV in data/semrush/raw/ (keyword lists stay placeholders, DECISIONS D-G)');
  const kwRegistry = readJSON(p.keywords, null);

  const cadence = readJSON(p.cadence);
  const health = readJSON(p.health, {});
  const spend = readJSON(p.spend, { months: {} });
  const charters = readJSON(p.charters, { sites: {} });
  const content = loadContent(project);
  const topicsBySite = Object.fromEntries(domains.map(d => [d, loadTopics(root, d)]));
  const minDays = cadence.min_fact_days_left ?? 0;

  // 2. Blocked topics whose facts are now usable go back to the queue.
  for (const d of domains) {
    let changed = false;
    for (const t of topicsBySite[d]) if (t.status === 'blocked' && !(t.missing_facts || []).length && !factProblems(t, project.registry, today, minDays).length && !topicRuleProblems({ ...t, site: d }, project).length && (t.facts_needed || []).length) {
      t.status = 'queued'; t.unblocked_at = today; summary.unblocked++; changed = true;
    }
    if (changed && !dryRun) saveTopics(root, d, topicsBySite[d]);
  }

  // 3. Which site+language queues are short?
  const needs = [];
  for (const d of domains) {
    if (onlySite && d !== onlySite) continue;
    const perDay = planningPerDay({ cadence, site: d, today, health });
    if (!perDay) { log(`${d}: disabled or paused, no planning`); continue; }
    const langs = activeLanguages(content, d);
    for (const lang of langs) {
      // D-H: the daily quota is shared by the active languages (rotation during the ramp, 1 each at the ceiling).
      const perLang = Math.min(cadence.max_posts_per_language_per_day ?? 1, perDay / langs.size);
      const ready = topicsBySite[d].filter(t => t.status === 'queued' && topicLang(t) === lang && !factProblems(t, project.registry, today, minDays).length).length;
      const target = Math.ceil((cadence.queue_target_days ?? 30) * perLang);
      const days = ready / perLang;
      if (ready >= target) { log(`${d} [${lang}]: ${ready} ready topics ≈ ${days.toFixed(0)} days: enough`); continue; }
      const count = Math.min(target - ready, cadence.plan_max_topics_per_call ?? 15);
      needs.push({ site: d, lang, count, ready });
      log(`${d} [${lang}]: ${ready} ready topics ≈ ${days.toFixed(0)} days < ${cadence.queue_target_days ?? 30}: asking for ${count}`);
    }
  }
  summary.requested = needs;
  if (!needs.length) return summary;
  if (!dryRun && !proposeFn) {
    const why = apiUnavailable(env);
    if (why) { summary.stopped = `topic proposals skipped: ${why}`; log(summary.stopped); return summary; }
    const client = makeClient(env);
    proposeFn = args => callClaude(client, { ...args, maxTokens: 16000, effort: cadence.claude?.effort ?? null, fallbacks: cadence.claude?.fallbacks ?? null, env });
  }

  for (const need of needs) {
    const request = planRequest({ project, content, topicsBySite, need, today, minDays, charters, kwRegistry });
    if (dryRun) { log(`===== planning request ${need.site} [${need.lang}] (dry run, no API call) =====\n${JSON.stringify(request, null, 2).slice(0, 4000)}\n`); continue; }
    if (spendStatus(spend, cadence, today).stop) { summary.stopped = 'monthly spend cap reached: planning stopped'; log(summary.stopped); break; }
    let res;
    try {
      res = await proposeFn({ system: PLANNER_SYSTEM, messages: [{ role: 'user', content: `Propose ${need.count} new topics.\n<request>\n${JSON.stringify(request)}\n</request>` }], format: { type: 'json_schema', schema: PROPOSAL_SCHEMA } });
      addSpend(spend, res.usage, { today, cadence, purpose: 'plan', site: need.site });
      writeJSON(p.spend, spend);
      checkStop(res);
    } catch (e) {
      writeJSON(p.spend, spend);
      if (e instanceof SkipTopicError) { log(`${need.site}: ${e.message}`); continue; }
      throw e;
    }
    let proposals = [];
    try { proposals = JSON.parse(res.text).topics || []; } catch { log(`${need.site}: the answer is not valid JSON, nothing added`); continue; }
    const { accepted, rejected } = acceptProposals({ proposals, site: need.site, lang: need.lang, project, content, topicsBySite, today, minDays, kwRegistry });
    for (const t of accepted) {
      topicsBySite[need.site].push(t);
      if (t.missing_facts?.length) addMissingCandidates(root, { site: need.site, topicId: t.id, requests: t.missing_facts, today });
    }
    saveTopics(root, need.site, topicsBySite[need.site]);
    appendJSONL(path.join(root, 'data/state/plan-log.jsonl'), rejected.map(r => ({ date: today, site: need.site, ...r })));
    summary.added.push(...accepted.map(t => ({ site: need.site, id: t.id, status: t.status })));
    summary.rejected.push(...rejected.map(r => ({ site: need.site, ...r })));
    log(`${need.site} [${need.lang}]: ${accepted.length} added (${accepted.filter(t => t.status === 'blocked').length} blocked on missing facts), ${rejected.length} rejected`);
  }
  return summary;
}

// The data sent to the model for one site+language.
export function planRequest({ project, content, topicsBySite, need, today, minDays, charters, kwRegistry }) {
  const { site, lang } = need;
  const s = project.sites.get(site);
  const charter = charters.sites?.[site] || {};
  const items = networkItems(content, topicsBySite);
  const otherOwns = Object.entries(charters.sites || {}).filter(([d]) => d !== site).flatMap(([d, c]) => (c.owns || []).map(o => `${o} (${d})`));
  const published = content.filter(p => p.fm.status === 'published');
  const flows = new Set(s.meta.flows || []);
  const keywords = (kwRegistry?.keywords || [])
    .filter(k => k.lang === lang && !k.reserved_for && (!k.owner_site || k.owner_site === site) && !items.some(o => o.lang === lang && matchKey(o.primary_keyword || '') === k.match_key))
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1)).slice(0, 60).map(k => ({ keyword: k.keyword, volume: k.volume, owner: k.owner_site }));
  return {
    today, site: site, language: lang, language_guidance: LANG_GUIDANCE[lang] || null, count: need.count,
    charter: { job: charter.job || s.meta.role, owns: charter.owns || [], never: charter.never || [], hard_rules: charter.hard_rules || [] },
    audience: charters.audience || null,
    banned_concepts: otherOwns,
    reserved_wikitours_concepts: project.targets.reserved_concepts,
    this_site_topics: items.filter(o => o.site === site).map(o => ({ lang: o.lang, title: o.title, primary_keyword: o.primary_keyword, cluster: o.cluster, concept_id: o.concept_id })),
    existing_concepts: [...new Set(items.map(o => o.concept_id))],
    clusters_of_other_sites: [...new Set(items.filter(o => o.site !== site).map(o => o.cluster))],
    approved_facts: project.registryList.filter(f => factProblems({ facts_needed: [f.id], lang }, project.registry, today, minDays).length === 0)
      .map(f => ({ id: f.id, topic: f.topic, source_tier: f.source_tier, claim_fr: f.claim_fr, ...(lang !== 'fr' && f[`claim_${lang}`] ? { [`claim_${lang}`]: f[`claim_${lang}`] } : {}), review_by: f.review_by })),
    approved_religious_texts: Object.values(project.kb || {}).filter(e => e.status === 'approved').length,
    keyword_candidates: keywords.length ? keywords : 'none yet (Semrush data pending): use realistic queries, never invent volumes',
    site_pages: published.filter(p => p.site === site && p.lang === lang && p.fm.type !== 'home').map(p => ({ slug: p.fm.slug, title: stripMarkers(p.fm.title) })),
    sister_pages: published.filter(p => flows.has(p.site) && p.lang === lang && !['home', 'trust'].includes(p.fm.type)).map(p => ({ site: p.site, slug: p.fm.slug, title: stripMarkers(p.fm.title) })),
    wikitours_targets: project.targets.targets.map(t => ({ id: t.id, label: t.label })),
  };
}

// Validates and normalises proposals against the whole network. Returns { accepted, rejected: [{title, reasons}] }.
export function acceptProposals({ proposals, site, lang, project, content, topicsBySite, today, minDays, kwRegistry }) {
  const accepted = [], rejected = [];
  const s = project.sites.get(site);
  const flows = new Set(s.meta.flows || []);
  const published = content.filter(p => p.fm.status === 'published');
  const siteSlugs = new Set(published.filter(p => p.site === site && p.lang === lang).map(p => p.fm.slug));
  const ref = s.meta.ref.toLowerCase();
  const existingIds = new Set(Object.values(topicsBySite).flat().map(t => t.id));
  let n = Object.values(topicsBySite).flat().filter(t => String(t.id).startsWith(`${ref}-${lang}-`)).length;
  const nextId = () => { let id; do { n++; id = `${ref}-${lang}-${String(n).padStart(4, '0')}`; } while (existingIds.has(id)); existingIds.add(id); return id; };

  for (const raw of proposals) {
    const t = {
      id: null, lang, title: String(raw.title || '').trim(), slug: slugify(raw.slug || raw.primary_keyword),
      primary_keyword: String(raw.primary_keyword || '').trim(), cluster: id_(raw.cluster), concept_id: id_(raw.concept_id),
      type: raw.type, tier: 'C', angle: raw.angle || '', outline: (raw.outline || []).map(String).slice(0, 12),
      facts_needed: [...new Set((raw.facts_needed || []).map(String))], missing_facts: (raw.missing_facts || []).map(String).filter(Boolean),
      internal_links: (raw.internal_links || []).filter(x => siteSlugs.has(x)),
      sister_links: (raw.sister_links || []).filter(l => flows.has(l.site) && published.some(p => p.site === l.site && p.lang === lang && p.fm.slug === l.slug)),
      cta_topic: String(raw.cta_topic || '').trim() || undefined, status: 'queued', notes: raw.notes || '', planned_at: today, planned_by: 'plan-topics',
    };
    if (raw.wt_target && project.wtTargets[raw.wt_target]) t.wt_target = raw.wt_target;
    const reasons = [];
    if (t.title.length < 20 || t.title.length > 70) reasons.push(`title length ${t.title.length} (20-70)`);
    if (!t.slug) reasons.push('no usable ASCII slug');
    if (!t.primary_keyword || !t.cluster || !t.concept_id) reasons.push('primary_keyword, cluster and concept_id are required');
    if (!POST_TYPES.includes(t.type)) reasons.push(`type "${t.type}"`);
    const items = networkItems(content, topicsBySite).concat(accepted.map(a => ({ site, lang, title: a.title, primary_keyword: a.primary_keyword, cluster: a.cluster, concept_id: a.concept_id, slug: a.slug, ref: `proposal ${a.id}`, kind: 'topic' })));
    reasons.push(...topicConflicts(t, site, items, project));
    const kw = (kwRegistry?.keywords || []).find(k => k.lang === lang && k.match_key === matchKey(t.primary_keyword));
    if (kw?.reserved_for) reasons.push(`keyword registry: "${kw.keyword}" is reserved for ${kw.reserved_for}`);
    else if (kw?.owner_site && kw.owner_site !== site) reasons.push(`keyword registry: "${kw.keyword}" is owned by ${kw.owner_site}`);
    // Facts: unknown ids become missing-fact requests; unusable facts block the topic.
    const unknown = t.facts_needed.filter(id => !project.registry[id]);
    t.facts_needed = t.facts_needed.filter(id => project.registry[id]);
    t.missing_facts.push(...unknown.map(id => `fact « ${id} » proposed by the planner (not in the registry)`));
    if (t.facts_needed.length < (MIN_FACTS[t.type] || 1) && !t.missing_facts.length) reasons.push(`${t.type} needs at least ${MIN_FACTS[t.type] || 1} registry fact(s) to cite`);
    reasons.push(...topicRuleProblems({ ...t, site }, project));
    if (reasons.length) { rejected.push({ title: t.title, reasons }); continue; }
    const problems = factProblems(t, project.registry, today, minDays);
    if (t.missing_facts.length || problems.length) {
      t.status = 'blocked';
      t.blocked_reason = [...problems.map(x => `${x.id} ${x.state}`), ...(t.missing_facts.length ? ['missing facts requested in data/facts/candidates.jsonl'] : [])].join('; ');
    }
    t.id = nextId();
    if (t.cta_topic === undefined) delete t.cta_topic;
    accepted.push(t);
  }
  return { accepted, rejected };
}
