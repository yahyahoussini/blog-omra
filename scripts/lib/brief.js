// Generation brief and prompts. The system prompt is identical for every call of a run (prompt-cache friendly);
// everything specific to a site or topic goes in the user message.
import fs from 'node:fs';
import path from 'node:path';
import { topicSlug, topicLang } from './topics.js';
import { stripMarkers } from '../../engine/lib/util.js';
import { wordingFor } from '../../engine/lib/facts-gate.js';
import { forLang } from '../../engine/lib/render.js';
import { phrasesFor } from '../../engine/lib/config.js';

// DECISIONS D-H: every page is written natively in its language, never translated from another page.
export const LANG_NAME = {
  fr: 'French as written in Morocco (Moroccan French: dirhams, Moroccan cities and institutions, vouvoiement, no France-specific references)',
  ar: 'natural Modern Standard Arabic as read in Morocco (not dialect, not a translation; Western digits 0-9; Moroccan institutions by their Arabic names)',
  en: 'clear, plain English for Moroccan and international readers (short sentences, no idioms; « Umrah » and « Hajj »; MAD amounts as written in the facts)',
};
const WORD_TARGET = { guide: '1500-2200', explainer: '800-1300', checklist: '800-1200', local: '800-1200', data: '500-900', news: '400-700' };

// The writer's contract is docs/ENGINE.md sections 3-6 (front matter, shortcodes, containers, facts), read at run time.
export function engineContract(root) {
  const file = path.join(root, 'docs/ENGINE.md');
  if (!fs.existsSync(file)) return '';
  const md = fs.readFileSync(file, 'utf8');
  const start = md.indexOf('## 3. Front matter'), end = md.indexOf('## 7.');
  return start >= 0 && end > start ? md.slice(start, end).trim() : '';
}

export function systemPrompt(root) {
  return [
    'You draft one blog post at a time for a network of Moroccan Omra/Hajj information sites published by Wiki Tours International, a licensed travel agency in Casablanca.',
    'Every page is useful to a pilgrim\'s family without ever contacting the agency. Calm, precise, practical tone. No hype, no urgency, no superlatives.',
    '',
    'Non-negotiable rules:',
    '1. Use ONLY the facts in the brief. After every sentence that states a number, a date or a rule, put its marker [[fact:<id>]] before the final punctuation.',
    '2. Every number in such a sentence must be one of the cited fact\'s values. Write no other digits anywhere (titles, headings, lists, tables, FAQ): spell ordinals and counts in words or avoid them. Approved fixed expressions in the brief are the only exception.',
    '3. A fact with required_wording must be written with that exact wording in the same sentence.',
    '4. If the reader needs a fact that the brief does not contain, write [[MISSING: short description of the fact needed]] instead of guessing, and keep the rest of the post honest about it (the unknowns section is the right place).',
    '5. Never invent prices, dates, rules, names, people, quotes, testimonials, statistics, seat counts or availability. Never write Qur\'an verses, hadith or du\'a text. No religious rulings.',
    '6. Links: same-site links only as [[link:slug|anchor]] with slugs from the brief (at least the required number); sister-site links only as [[site:domain/slug|anchor]] with targets from the brief; a wikitours.ma link only as [[wt:target|anchor]] when the brief allows one, never in the first sentence, never in a table, with a brand or descriptive anchor. Plain Markdown links only to URLs listed in allowed_outbound_urls.',
    '7. Do not write a byline, an author name, a « relu par » line, a disclosure box or a WhatsApp/CTA paragraph: the engine adds them. Never claim a human reviewed the page.',
    '8. Never use these words or claims, in any language: « garanti », « 100 % », « 0 % d\'intérêt », « sans intérêt », « dernières places », « places limitées », « dépêchez-vous », « meilleur », « leader » about any agency; « مضمون », « 100 % », « بدون فوائد », « أماكن محدودة », « سارعوا »; « guaranteed », « 100% », « 0% interest », « interest-free », « last seats », « limited places », « hurry », « best » about any agency.',
    '9. Start the body with a :::answer box (40-60 words) that answers the title. Include a :::unknown section (« what we do not know yet ») for guide and explainer posts. Use :::steps around numbered lists.',
    '10. Do not mention a year lower than the current season year in the title.',
    '11. Never write HTML tags (no <a>, <br>, <img>, comments): Markdown, shortcodes and containers only. Never name an agency, tour operator or company that is not in the brief.',
    '12. Language: write the whole file (title, description, summary, headings, body, FAQ) natively in the language given by brief.language and front_matter_fixed.lang. fr = Moroccan French; ar = natural Modern Standard Arabic; en = clear English. Think and write in that language from the facts: never translate, adapt or mirror another page of the network, in any language. Use the claim in the page language when the fact gives one (claim_ar, claim_en), otherwise express claim_fr in your own words in the page language, keeping every value and the required wording exactly as given.',
    '13. Rule words need a fact marker in every language: obligatoire, interdit, gratuit, garanti, remboursé, visa, vaccin, délai…; واجب، يجب، يلزم، إلزامي، شرط، مطلوب، ممنوع، محظور، مجاني، تأشيرة، مضمون، استرداد، لقاح، تطعيم، حصة، آخر أجل، مهلة، تصريح…; mandatory, compulsory, required, must, prohibited, banned, not allowed, permit, free of charge, guaranteed, refund, quota, visa, vaccine, deadline.',
    '',
    'Output: ONLY the complete Markdown file, starting with the line --- (YAML front matter, then the body). No code fences, no commentary.',
    'Front matter: copy front_matter_fixed exactly, then add title (20-70 characters), description (70-160 characters), summary (one sentence) and optionally faq (2-5 items whose answers follow the same fact rules). Do not add sources, reviewed_by, full_read or any other field.',
    '',
    'The engine contract (docs/ENGINE.md, sections 3-6) follows. It is the reference for front matter, shortcodes, containers and the facts gate.',
    '',
    engineContract(root),
  ].join('\n');
}

const pageRef = p => ({ slug: p.fm.slug, title: stripMarkers(p.fm.title), type: p.fm.type, kind: p.kind });

/**
 * Builds the brief for one topic.
 * @param {object} o
 * @param {object} o.project   engine project (loadProject)
 * @param {object[]} o.content all content files (loadContent), drafts included
 * @param {object} o.topic
 * @param {string} o.site
 * @param {string} o.today
 * @param {string} o.status    'published' (auto) or 'draft' (review)
 * @param {object} o.charters  config/charters.json
 */
export function buildBrief({ project, content, topic, site, today, status, charters }) {
  const s = project.sites.get(site);
  const lang = topicLang(topic);
  const charter = charters?.sites?.[site] || {};
  // The required wording is given in the page language (the facts gate checks that one); claim_fr stays as the reference.
  const facts = (topic.facts_needed || []).map(id => project.registry[id]).filter(Boolean).map(f => ({
    id: f.id, claim_fr: f.claim_fr, ...(lang !== 'fr' && f[`claim_${lang}`] ? { [`claim_${lang}`]: f[`claim_${lang}`] } : {}),
    values: f.values, unit: f.unit, confidence: f.confidence, source_tier: f.source_tier,
    required_wording: f.required_wording ? wordingFor(f, lang) : null, source_urls: f.source_urls, verified_at: f.verified_at,
    ...(f.conflicts?.length ? { conflicting_values_not_usable: f.conflicts.map(c => c.value) } : {}),
  }));
  const published = content.filter(p => p.fm.status === 'published' && p.fm.date <= today);
  // Same-site targets: the topic's wished links first, then the other pages, the home page last
  // (a site's first posts can only link to the home, editeur and contact pages).
  const sameSite = published.filter(p => p.site === site && p.lang === lang && p.fm.type !== 'home');
  const home = published.filter(p => p.site === site && p.lang === lang && p.fm.type === 'home');
  const wanted = new Set(topic.internal_links || []);
  const internal = [...sameSite.filter(p => wanted.has(p.fm.slug)), ...sameSite.filter(p => !wanted.has(p.fm.slug))].slice(0, 40).concat(home).map(pageRef);
  if (published.some(p => p.site === site && p.lang === lang && p.kind === 'posts')) internal.push({ slug: 'blog', title: 'index des articles', type: 'listing', kind: 'pages' });

  const flows = new Set(s.meta.flows || []);
  let sister = (topic.sister_links || []).filter(l => flows.has(l.site))
    .map(l => published.find(p => p.site === l.site && p.lang === lang && p.fm.slug === l.slug)).filter(Boolean);
  if (!sister.length) sister = published.filter(p => flows.has(p.site) && p.lang === lang && !['home', 'trust'].includes(p.fm.type)).slice(0, 12);
  const sisterTargets = sister.map(p => ({ site: p.site, slug: p.fm.slug, title: stripMarkers(p.fm.title), shortcode: `[[site:${p.site}/${p.fm.slug}|…]]` }));

  const wt = topic.wt_target && project.wtTargets[topic.wt_target] ? { id: topic.wt_target, label: project.wtTargets[topic.wt_target].label, shortcode: `[[wt:${topic.wt_target}|…]]` } : null;
  const policy = project.linkPolicy;
  const labels = s.labels[lang] || s.labels.fr;

  return {
    today,
    language: { code: lang, write_as: LANG_NAME[lang] || lang, rule: 'Write natively in this language for its own readers and searches. Never translate another page.' },
    site: {
      domain: site, name: s.meta.name, role: s.meta.role, tagline: forLang(project, s.config.tagline, lang),
      job: charter.job || s.meta.role, owns: charter.owns || [], never: charter.never || [], hard_rules: charter.hard_rules || [],
      audience: charters?.audience || null,
      box_labels: { answer: labels.answer, retenir: labels.retenir, unknown: labels.unknown, steps: labels.steps, warning: labels.warning },
    },
    topic: {
      id: topic.id, title_idea: topic.title, primary_keyword: topic.primary_keyword, type: topic.type, angle: topic.angle || null,
      outline: topic.outline || [], notes: topic.notes || null, target_words: WORD_TARGET[topic.type] || '800-1200',
    },
    front_matter_fixed: {
      slug: topicSlug(topic), type: topic.type, tier: topic.tier || 'C', lang, date: today, status, author: 'org',
      primary_keyword: topic.primary_keyword, cluster: topic.cluster, concept_id: topic.concept_id,
      cta: { type: 'whatsapp', topic: topic.cta_topic || forLang(project, s.config.whatsapp?.default_topic, lang) || labels.waTopic || s.meta.name },
    },
    facts,
    allowed_outbound_urls: [...new Set(facts.flatMap(f => f.source_urls))],
    approved_fixed_expressions: phrasesFor(project, site, lang),
    internal_links: internal,
    sister_links: sisterTargets,
    wikitours_link: wt,
    requirements: {
      min_same_site_links: policy.min_same_site_links_per_post,
      max_sister_links: Math.min(policy.sister_links_per_post, sisterTargets.length),
      max_wikitours_links: wt ? policy.money_links_per_post : 0,
      unknown_section_required: ['guide', 'explainer', 'pillar'].includes(topic.type),
      min_fact_citations: Math.min(2, facts.length),
    },
  };
}

export function draftMessage(brief) {
  return `Write the post described by this brief. Return only the Markdown file.\n\n<brief>\n${JSON.stringify(brief, null, 2)}\n</brief>`;
}

export function revisionMessage(errors) {
  const list = errors.slice(0, 40).map(e => `- [${e.gate}] ${e.msg}`).join('\n');
  return `The automated gates rejected this draft:\n${list}\n\nRewrite the complete file so that every gate passes. Remove or rephrase any sentence you cannot support with a fact from the brief. A published page cannot contain [[MISSING: …]] markers: drop the claim, or describe the gap in plain words in the unknowns section (no digits, no rule words such as visa, obligatoire, délai). Return only the Markdown file.`;
}

// Gate 3 (claims verifier): a second, independent call lists every checkable claim of a draft and maps it to brief
// facts. A claim no brief fact supports is a gate error (DECISIONS D-C keeps every §7.4 gate in auto mode).
export const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['claims'],
  properties: {
    claims: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['claim', 'fact_ids'], properties: { claim: { type: 'string' }, fact_ids: { type: 'array', items: { type: 'string' } } } },
    },
  },
};

export const VERIFIER_SYSTEM = [
  'You are a strict fact checker for a Moroccan Omra/Hajj information site. You receive a draft and the only facts its writer was allowed to use.',
  'List EVERY checkable claim in the draft (front matter title, description, summary, body, FAQ): any statement about the world that could be true or false.',
  'This includes rules and requirements, dates, prices, numbers, durations, what an organisation, ministry, platform (such as Nusuk), airport, airline or agency offers, allows or requires, and past events.',
  'Do not list advice ("check your passport early"), the page\'s own method, statements about what the page contains, or plain definitions of common words.',
  'For each claim, fact_ids lists the ids of the given facts that fully support it (same meaning, not just the same topic). Use [] when no given fact supports it.',
  'Quote each claim briefly in the draft\'s language. Return the JSON object only.',
].join('\n');

export function verifyMessage(brief, draft) {
  const facts = brief.facts.map(f => ({ id: f.id, claim: f[`claim_${brief.front_matter_fixed.lang}`] || f.claim_fr, values: f.values }));
  return `<facts>\n${JSON.stringify(facts, null, 2)}\n</facts>\n\n<draft>\n${draft}\n</draft>`;
}

// Gate errors for the verifier answer (fail closed: an unreadable answer is an error too).
export function claimErrors(text, brief) {
  let claims;
  try { claims = JSON.parse(text).claims; } catch { return [{ gate: 'claims', msg: 'the claims verifier answer is not valid JSON: the draft cannot be checked' }]; }
  if (!Array.isArray(claims)) return [{ gate: 'claims', msg: 'the claims verifier returned no claim list' }];
  const ids = new Set(brief.facts.map(f => f.id));
  return claims.filter(c => !(c.fact_ids || []).some(id => ids.has(id)))
    .map(c => ({ gate: 'claims', msg: `claim not supported by a fact of the brief: « ${String(c.claim).slice(0, 160)} » (remove it or rephrase it so a brief fact supports it)` }));
}
