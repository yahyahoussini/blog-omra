// Turns a model draft into a clean post file and runs every engine gate on it in the context of the whole network.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { buildNetwork } from '../../engine/lib/build.js';
import { docFeatures, jaccard } from '../../engine/lib/similarity.js';
import { normalizeDates } from '../../engine/lib/util.js';
import { linkTargets } from '../../engine/lib/markdown.js';

const MISSING = /\[\[MISSING:\s*([^\]]+?)\s*\]\]/g;
export const missingRequests = text => [...new Set([...String(text).matchAll(MISSING)].map(m => m[1].trim()))];

// Front-matter fields the model may write; everything else comes from the brief.
const MODEL_FIELDS = ['title', 'description', 'summary', 'faq'];

/**
 * Normalises the model output: strips code fences, keeps only allowed model fields and forces the fixed ones.
 * @returns {{ text:string|null, fm:object|null, body:string, problems:object[] }}
 */
export function normalizeDraft(raw, fixed) {
  let s = String(raw || '').trim().replace(/^```(?:markdown|md)?\s*\n/, '').replace(/\n```\s*$/, '').trim();
  const at = s.indexOf('---');
  if (at > 0 && at < 200) s = s.slice(at); // tolerate a short preamble before the front matter
  if (!s.startsWith('---')) return { text: null, fm: null, body: '', problems: [{ gate: 'format', msg: 'the answer does not start with YAML front matter (---)' }] };
  let parsed;
  try { parsed = matter(s, {}); } catch (e) { return { text: null, fm: null, body: '', problems: [{ gate: 'format', msg: `front matter does not parse: ${e.message}` }] }; }
  const data = normalizeDates(parsed.data);
  const fm = {};
  for (const k of ['title', 'description']) fm[k] = data[k];
  Object.assign(fm, fixed);
  for (const k of MODEL_FIELDS.slice(2)) if (data[k] != null) fm[k] = data[k];
  if (Array.isArray(fm.faq)) fm.faq = fm.faq.filter(x => x && x.q && x.a).slice(0, 12).map(x => ({ q: String(x.q), a: String(x.a) }));
  const body = parsed.content.trim() + '\n';
  return { text: matter.stringify(body, JSON.parse(JSON.stringify(fm))), fm, body, problems: [] };
}

// Generator-only checks the engine cannot know about (brief scope).
export function briefChecks({ fm, body }, brief) {
  const problems = [];
  const all = [fm.title, fm.description, fm.summary, body, ...(fm.faq || []).flatMap(f => [f.q, f.a])].join('\n');
  for (const m of missingRequests(all)) problems.push({ gate: 'missing-fact', msg: `[[MISSING: ${m}]] left in the draft (a published page cannot contain it)` });
  const allowedFacts = new Set(brief.facts.map(f => f.id));
  for (const [, id] of all.matchAll(/\[\[fact:([a-z0-9_]+)\]\]/g)) if (!allowedFacts.has(id)) problems.push({ gate: 'brief-scope', msg: `[[fact:${id}]] is not one of the facts in the brief` });
  // Outbound links as the renderer sees them (titled, reference-style, autolinks, raw <a href>): only fact sources.
  const allowedUrls = new Set(brief.allowed_outbound_urls);
  const texts = [body, ...(fm.faq || []).map(f => f.a)];
  for (const url of new Set(texts.flatMap(linkTargets))) {
    if (url.startsWith('#') || url.startsWith('/') && !url.startsWith('//')) continue; // same-page / same-site
    if (!allowedUrls.has(url)) problems.push({ gate: 'brief-scope', msg: `outbound URL not from an approved fact source: ${url}` });
  }
  const sister = new Set(brief.sister_links.map(l => `${l.site}/${l.slug}`));
  for (const [, ref] of all.matchAll(/\[\[site:([^\]|]+)/g)) if (!sister.has(ref.trim())) problems.push({ gate: 'brief-scope', msg: `sister link [[site:${ref}]] is not an allowed target in the brief` });
  const wt = [...all.matchAll(/\[\[wt:([^\]|]+)/g)].map(m => m[1].trim());
  if (wt.length && (!brief.wikitours_link || wt.some(id => id !== brief.wikitours_link.id))) problems.push({ gate: 'brief-scope', msg: 'wikitours.ma link not allowed by the brief' });
  if (/relu par|reviewed by|راجعه/i.test(body)) problems.push({ gate: 'brief-scope', msg: 'the body claims a human review' });
  return problems;
}

export const errorKey = f => [f.gate, f.site, f.file, f.url, f.msg].join('|');
const key = errorKey;

// Gate run without any draft: the errors that already exist are not blamed on a draft.
export async function networkBaseline(root, today) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-gate-'));
  try {
    const res = await buildNetwork({ root, outDir: out, today, write: false });
    return { errorKeys: new Set(res.errors.map(key)), errors: res.errors.length };
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
}

/**
 * Gates one draft file (repo-relative path) as if it were on disk. Stale facts are errors for drafts (ENGINE.md 6).
 * @returns {{ ok:boolean, errors:object[], warnings:object[], nearestDup:number|null }}
 */
export async function gateDraft({ root, today, file, text, baseline }) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-gate-'));
  let res;
  try { res = await buildNetwork({ root, outDir: out, today, write: false, overlay: [{ file, text }], focusOverlay: true }); }
  finally { fs.rmSync(out, { recursive: true, force: true }); }
  const errors = res.errors.filter(f => !baseline.errorKeys.has(key(f)));
  const mine = res.warnings.filter(w => w.file === file);
  for (const w of mine) if (w.gate === 'facts' && /fact-past-review|fact-expired/.test(w.msg)) errors.push({ ...w, level: 'error' });
  const page = res.pages.find(p => p.file === file);
  let nearestDup = null;
  if (!page) {
    const why = res.excluded.find(x => x.file === file)?.reason || 'invalid front matter';
    if (!errors.some(e => e.file === file)) errors.push({ level: 'error', gate: 'frontmatter', file, msg: `the draft was not rendered (${why})` });
  } else {
    const sh = docFeatures(page.plain).shingles5; // cached: computed once by the duplicate gate
    nearestDup = 0;
    for (const o of res.pages) if (o !== page) nearestDup = Math.max(nearestDup, jaccard(sh, docFeatures(o.plain).shingles5));
    nearestDup = Math.round(nearestDup * 1000) / 1000;
  }
  // The network as it will be once this draft is written: the next draft's baseline when this one passes.
  const nextBaseline = { errorKeys: new Set(res.errors.map(key)), errors: res.errors.length };
  return { ok: errors.length === 0, errors, warnings: mine.filter(w => !(w.gate === 'facts' && /fact-past-review|fact-expired/.test(w.msg))), nearestDup, nextBaseline };
}
