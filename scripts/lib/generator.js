// Daily generator core (used by scripts/generate.js and the tests). One topic = one draft, at most one revision.
import fs from 'node:fs';
import path from 'node:path';
import { loadProject } from '../../engine/lib/config.js';
import { loadContent } from '../../engine/lib/content.js';
import { sha256 } from '../../engine/lib/util.js';
import { readJSON, writeJSON, readJSONL, appendJSONL, isoWeek, paths } from './common.js';
import { siteQuota, languageSlots, languagePlan, addSpend, spendStatus } from './cadence.js';
import { loadTopics, saveTopics, selectTopics, networkItems, activeLanguages, postCounts, topicSlug, topicLang } from './topics.js';
import { buildBrief, systemPrompt, draftMessage, revisionMessage, VERIFIER_SYSTEM, VERIFY_SCHEMA, verifyMessage, claimErrors } from './brief.js';
import { normalizeDraft, briefChecks, gateDraft, networkBaseline, missingRequests } from './draft-gate.js';
import { apiUnavailable, makeClient, callClaude, checkStop, FatalApiError, SkipTopicError } from './claude.js';

// Adds [[MISSING: …]] requests to data/facts/candidates.jsonl (deduplicated). Never usable until a human approves.
export function addMissingCandidates(root, { site, topicId, requests, today }) {
  const file = paths(root).candidates;
  const known = new Set(readJSONL(file).map(c => c.id));
  const rows = [];
  for (const request of requests) {
    const id = `cand_missing_${sha256(`${site}|${request.toLowerCase()}`).slice(0, 10)}`;
    if (known.has(id)) continue;
    known.add(id);
    rows.push({ id, proposed_at: today, proposed_by: 'generator', kind: 'missing-fact-request', site, topic_id: topicId, request, status: 'requested' });
  }
  appendJSONL(file, rows);
  return rows.length;
}

function addToQueue(root, today, item) {
  const week = isoWeek(today).label;
  const file = path.join(paths(root).queueDir, `${week}.json`);
  const q = readJSON(file, { week, items: [] });
  q.items = q.items.filter(i => i.file !== item.file).concat(item);
  writeJSON(file, q);
}

/**
 * @param {object} o
 * @param {string} o.root
 * @param {string} o.today       YYYY-MM-DD (Africa/Casablanca)
 * @param {string} [o.site]      only this domain
 * @param {number} [o.limit]     max drafts in this run (all sites)
 * @param {boolean} [o.dryRun]   no API call, nothing written: prints the briefs
 * @param {Function} [o.draftFn] ({system, messages}) => {text, content, usage, stopReason}; default = Claude API
 * @param {Function} [o.verifyFn] claims verifier ({system, messages, format}) => same shape; required with a custom draftFn
 * @param {object} [o.env]
 * @param {Function} [o.log]
 */
export async function runGenerate({ root, today, site: onlySite = null, limit = Infinity, dryRun = false, draftFn = null, verifyFn = null, env = process.env, log = console.log, printSystem = false }) {
  const p = paths(root);
  const summary = { written: [], failed: [], deferred: [], idle: [], briefs: [], stopped: null };
  const cadence = readJSON(p.cadence);
  const health = readJSON(p.health, {});
  const spend = readJSON(p.spend, { months: {} });
  const charters = readJSON(p.charters, { sites: {} });
  const project = await loadProject(root);
  if (onlySite && !project.sites.has(onlySite)) throw new Error(`unknown site ${onlySite}`);
  let content = loadContent(project);
  const week = isoWeek(today);
  const system = systemPrompt(root);

  if (!dryRun && !draftFn) {
    const why = apiUnavailable(env);
    if (why) { summary.stopped = `skipped: ${why} (set the ANTHROPIC_API_KEY secret and the CLAUDE_MODEL repository variable)`; log(summary.stopped); return summary; }
    const client = makeClient(env);
    draftFn = args => callClaude(client, { ...args, maxTokens: cadence.claude?.max_tokens ?? 32000, effort: cadence.claude?.effort ?? null, fallbacks: cadence.claude?.fallbacks ?? null, env });
    verifyFn = args => callClaude(client, { ...args, maxTokens: cadence.claude?.verify_max_tokens ?? 8000, effort: cadence.claude?.effort ?? null, env });
  }
  if (!dryRun && !verifyFn) throw new Error('runGenerate: a custom draftFn needs a verifyFn (the claims verifier, gate 3)');
  const spendNow = spendStatus(spend, cadence, today);
  if (!dryRun && spendNow.stop) { summary.stopped = `monthly spend cap reached (${spendNow.usd.toFixed(2)} / ${spendNow.cap} USD estimated): no generation until next month`; log(summary.stopped); return summary; }
  if (printSystem) log(`----- system prompt (${system.length} chars) -----\n${system}\n-----`);

  let baseline = dryRun ? null : await networkBaseline(root, today);
  if (baseline?.errors) log(`note: the network already has ${baseline.errors} gate error(s); drafts are judged only on the errors they add`);
  let budget = limit;

  for (const site of project.sites.keys()) {
    if (onlySite && site !== onlySite) continue;
    if (budget <= 0) break;
    const counts = postCounts(content, site, today, week);
    const q = siteQuota({ cadence, site, today, health, postsToday: counts.today, postsThisWeek: counts.week, simulateLaunch: dryRun });
    if (!q.quota) { summary.idle.push({ site, reason: q.reasons.join('; ') || 'quota reached for today' }); log(`${site}: idle (${q.reasons.join('; ') || `today's quota of ${q.perDay} is used`})`); continue; }
    const topics = loadTopics(root, site);
    const activeLangs = activeLanguages(content, site);
    const { selected, skipped } = selectTopics({
      topics, site, project, items: networkItems(content), today, minFactDays: cadence.min_fact_days_left ?? 0,
      quota: Math.min(q.quota, budget), langSlots: languageSlots(cadence, counts.todayByLang), activeLangs,
      langPlan: languagePlan({ cadence, day: q.day, perDay: q.perDay, active: activeLangs }),
    });
    for (const s of skipped) log(`${site}: topic ${s.id} waits: ${s.reason}`);
    if (!selected.length) { summary.idle.push({ site, reason: 'no eligible queued topic (supply brake: the site idles)' }); log(`${site}: quota ${q.quota}${q.reasons.length ? ` (${q.reasons.join('; ')})` : ''}, no eligible queued topic: idle`); continue; }
    log(`${site}: ramp day ${q.day}, quota ${q.quota} (${[...new Set(selected.map(topicLang))].join(' + ')}), ${selected.length} topic(s) selected${q.reasons.length ? ` (${q.reasons.join('; ')})` : ''}`);

    for (const topic of selected) {
      if (budget <= 0) break;
      budget--;
      const status = cadence.publish_mode === 'review' ? 'draft' : 'published';
      const brief = buildBrief({ project, content, topic, site, today, status, charters });
      if (dryRun) {
        summary.briefs.push({ site, topic: topic.id, brief });
        log(`===== brief ${site} / ${topic.id} (dry run: no API call; system prompt ${system.length} chars, cached) =====\n${draftMessage(brief)}\n`);
        continue;
      }
      if (spendStatus(spend, cadence, today).stop) { summary.stopped = 'monthly spend cap reached during the run'; log(summary.stopped); return summary; }
      const lang = topicLang(topic);
      const file = `content/${site}/${lang}/posts/${topicSlug(topic)}.md`;
      if (fs.existsSync(path.join(root, file))) { summary.deferred.push({ site, topic: topic.id, reason: `${file} already exists` }); log(`${site}: ${topic.id} skipped, ${file} already exists`); continue; }

      let result;
      try {
        result = await draftTopic({ root, today, site, topic, brief, file, system, draftFn, verifyFn, baseline, spend, cadence });
      } catch (e) {
        writeJSON(p.spend, spend);
        if (e instanceof SkipTopicError) {
          appendJSONL(p.failures, [{ date: today, site, topic_id: topic.id, outcome: 'deferred', errors: [{ gate: 'api', msg: e.message }] }]);
          summary.deferred.push({ site, topic: topic.id, reason: e.message }); log(`${site}: ${topic.id} deferred: ${e.message}`); continue;
        }
        throw e;
      }
      writeJSON(p.spend, spend);
      const added = addMissingCandidates(root, { site, topicId: topic.id, requests: result.missing, today });
      if (added) log(`${site}: ${added} missing-fact request(s) added to data/facts/candidates.jsonl`);

      if (result.ok) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), result.text);
        Object.assign(topic, { status: 'done', file, done_at: today, mode: cadence.publish_mode });
        delete topic.last_errors;
        if (status === 'draft') addToQueue(root, today, { site, lang, file, slug: topicSlug(topic), topic_id: topic.id, title: result.title, created_at: today, status: 'draft' });
        summary.written.push({ site, topic: topic.id, file, status, attempts: result.attempts, nearestDup: result.nearestDup });
        log(`${site}: ${topic.id} passed all gates (attempt ${result.attempts}) → ${file} [${status}]`);
        content = loadContent(project);
        // Auto mode: the passing gate run already is the network with this post (saves a full build per post).
        baseline = status === 'published' && result.nextBaseline ? result.nextBaseline : await networkBaseline(root, today);
      } else {
        appendJSONL(p.failures, [{ date: today, site, topic_id: topic.id, title: topic.title, outcome: 'discarded', attempts: result.attempts, errors: result.errors.slice(0, 30).map(e => ({ gate: e.gate, msg: e.msg })), missing: result.missing }]);
        Object.assign(topic, { status: 'failed', failed_at: today, last_errors: result.errors.slice(0, 5).map(e => `[${e.gate}] ${e.msg}`) });
        summary.failed.push({ site, topic: topic.id, errors: result.errors.length });
        log(`${site}: ${topic.id} failed the gates twice: discarded (${result.errors.length} errors, see data/state/failures.jsonl)`);
      }
      saveTopics(root, site, topics);
    }
  }
  return summary;
}

// Draft → gates → claims verifier → (one revision) → gates → verifier. Usage is added to `spend` after every call.
async function draftTopic({ root, today, site, topic, brief, file, system, draftFn, verifyFn, baseline, spend, cadence }) {
  const messages = [{ role: 'user', content: draftMessage(brief) }];
  const missing = new Set();
  let errors = [], title = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await draftFn({ system, messages });
    addSpend(spend, res.usage, { today, cadence, purpose: 'generate', site });
    checkStop(res);
    for (const m of missingRequests(res.text)) missing.add(m);
    // Gate the draft as a published page (review-mode drafts would otherwise be excluded from the build),
    // then write it with the real status.
    const norm = normalizeDraft(res.text, brief.front_matter_fixed);
    const asPublished = normalizeDraft(res.text, { ...brief.front_matter_fixed, status: 'published' });
    errors = [...norm.problems];
    let nearestDup = null, nextBaseline = null;
    if (norm.text) {
      errors.push(...briefChecks(norm, brief));
      const g = await gateDraft({ root, today, file, text: asPublished.text, baseline });
      errors.push(...g.errors);
      nearestDup = g.nearestDup;
      nextBaseline = g.nextBaseline;
      title = norm.fm.title;
    }
    // Gate 3: only a draft that passed every mechanical gate goes to the claims verifier.
    if (norm.text && !errors.length) {
      const v = await verifyFn({ system: VERIFIER_SYSTEM, messages: [{ role: 'user', content: verifyMessage(brief, norm.text) }], format: { type: 'json_schema', schema: VERIFY_SCHEMA } });
      addSpend(spend, v.usage, { today, cadence, purpose: 'verify', site });
      checkStop(v);
      errors.push(...claimErrors(v.text, brief));
    }
    const ok = errors.length === 0;
    appendJSONL(paths(root).drafts, [{ date: today, site, topic_id: topic.id, attempt, ok, errors: errors.length, gates: [...new Set(errors.map(e => e.gate))], nearest_dup: nearestDup }]);
    if (ok) return { ok, text: norm.text, title, attempts: attempt, nearestDup, nextBaseline, missing: [...missing] };
    if (attempt === 1) messages.push({ role: 'assistant', content: res.content?.length ? res.content : res.text }, { role: 'user', content: revisionMessage(errors) });
  }
  return { ok: false, errors, attempts: 2, missing: [...missing] };
}

export { FatalApiError };
