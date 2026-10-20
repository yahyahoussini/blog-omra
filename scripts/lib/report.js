// Weekly one-page report (STRATEGY 16.7 adapted): data collection (files only, no network) + Markdown rendering.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadProject } from '../../engine/lib/config.js';
import { loadContent } from '../../engine/lib/content.js';
import { buildNetwork } from '../../engine/lib/build.js';
import { stripMarkers } from '../../engine/lib/util.js';
import { readJSON, readJSONL, addDays, isoWeek, monthOf, paths } from './common.js';
import { planningPerDay, spendStatus } from './cadence.js';
import { loadTopics, factProblems, activeLanguages } from './topics.js';

export async function collectReportData({ root, today }) {
  const p = paths(root);
  const week = isoWeek(today);
  const project = await loadProject(root);
  const content = loadContent(project);
  const cadence = readJSON(p.cadence);
  const health = readJSON(p.health, {});
  const spend = readJSON(p.spend, { months: {} });
  const drafts = readJSONL(p.drafts).filter(d => d.date >= week.monday && d.date <= week.sunday);
  const failures = readJSONL(p.failures).filter(d => d.date >= week.monday && d.date <= week.sunday);
  const candidates = readJSONL(p.candidates);
  const inWeek = d => d >= week.monday && d <= week.sunday && d <= today;
  const minDays = cadence.min_fact_days_left ?? 0;

  // Fresh gate run (nothing written) for warnings: duplicates, cannibalisation, stale facts.
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-report-'));
  let gates;
  try { gates = await buildNetwork({ root, outDir: out, today, write: false }); } finally { fs.rmSync(out, { recursive: true, force: true }); }

  const sites = [];
  for (const s of project.sites.values()) {
    const d = s.domain;
    const posts = content.filter(x => x.site === d && x.kind === 'posts');
    const topics = loadTopics(root, d);
    const ready = topics.filter(t => t.status === 'queued' && !factProblems(t, project.registry, today, minDays).length);
    const perDay = planningPerDay({ cadence, site: d, today, health });
    const gsc = readJSON(path.join(p.gscDir, `${d}.json`), null);
    sites.push({
      domain: d, ref: s.meta.ref,
      publishedThisWeek: posts.filter(x => x.fm.status === 'published' && inWeek(x.fm.date)).map(x => ({ title: stripMarkers(x.fm.title), url: `https://${d}${x.lang === 'fr' ? '' : '/' + x.lang}/blog/${x.fm.slug}/`, lang: x.lang })),
      draftsWaiting: posts.filter(x => x.fm.status === 'draft').length,
      queue: { queued: topics.filter(t => t.status === 'queued').length, ready: ready.length, blocked: topics.filter(t => t.status === 'blocked').length, failed: topics.filter(t => t.status === 'failed').length, perDay, daysLeft: perDay ? Math.floor(ready.length / Math.min(perDay, (cadence.max_posts_per_language_per_day ?? 1) * Math.max(1, activeLanguages(content, d).size))) : null },
      gate: { attempts: drafts.filter(x => x.site === d).length, failedAttempts: drafts.filter(x => x.site === d && !x.ok).length, discarded: failures.filter(x => x.site === d && x.outcome === 'discarded').length, topGates: topCounts(failures.filter(x => x.site === d).flatMap(f => (f.errors || []).map(e => e.gate))) },
      health: health[d] || null,
      spendUsd: spend.months?.[monthOf(today)]?.by_site?.[d] || 0,
      gsc: gsc ? { last28d: gsc.last28d, trend: gsc.trend, end_date: gsc.end_date } : null,
    });
  }

  const horizon = addDays(today, 14);
  const usedBy = {};
  for (const x of content.filter(c => c.fm.status === 'published')) for (const [, id] of (x.body + JSON.stringify(x.fm)).matchAll(/\[\[fact:([a-z0-9_]+)\]\]/g)) (usedBy[id] ??= new Set()).add(`${x.site}/${x.fm.slug}`);
  const facts = project.registryList.filter(f => f.status === 'approved').flatMap(f => {
    const due = [f.review_by && ['review_by', f.review_by], f.valid_until && ['valid_until', f.valid_until]].filter(Boolean).filter(([, v]) => v <= horizon);
    return due.map(([field, date]) => ({ id: f.id, field, date, past: date < today, usedBy: usedBy[f.id]?.size || 0 }));
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    today, week, generatedAt: new Date().toISOString(), mode: cadence.publish_mode, paused: !!cadence.paused, launchDate: cadence.launch_date,
    sites, facts,
    missing: candidates.filter(c => c.kind === 'missing-fact-request' && c.status === 'requested').map(c => ({ ...c, isNew: inWeek(c.proposed_at) })),
    otherCandidates: candidates.filter(c => c.kind !== 'missing-fact-request').length,
    spend: { ...spendStatus(spend, cadence, today), postsThisMonth: content.filter(x => x.kind === 'posts' && monthOf(x.fm.date || '') === monthOf(today) && x.fm.status !== 'retired').length },
    healthMeta: health._meta || null,
    cannibal: {
      gsc: readJSON(path.join(p.gscDir, 'cannibalisation.json'), { suspects: [] }).suspects || [],
      gates: gates.findings.filter(f => ['cannibalisation', 'duplicate'].includes(f.gate)).map(f => ({ level: f.level, site: f.site, file: f.file, msg: f.msg })),
    },
    gateErrors: gates.errors.length,
    staleWarnings: gates.findings.filter(f => f.gate === 'facts' && f.level === 'warning').length,
    whatsappMissing: gates.findings.filter(f => f.gate === 'whatsapp').map(f => f.site),
  };
}

const topCounts = list => Object.entries(list.reduce((m, k) => ({ ...m, [k]: (m[k] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ×${n}`);
const state = h => (!h ? '○ no data' : h.paused ? '● RED paused' : h.multiplier < 1 ? `● AMBER x${h.multiplier}` : '● green');
const usd = x => `${(x || 0).toFixed(2)} USD`;

export function buildReport(d) {
  const L = [];
  L.push(`# Revue hebdo ${d.week.label} (${d.week.monday} → ${d.week.sunday})`, '');
  L.push(`Generated ${d.generatedAt.slice(0, 16).replace('T', ' ')} UTC · mode **${d.mode}**${d.paused ? ' · **PAUSED (config/cadence.json)**' : ''} · launch date ${d.launchDate || '**not set: the generator does nothing**'}`, '');
  L.push('## Status', '', '| Site | Kill-switch | Published this week | Drafts waiting | Queue ready (days left) | Blocked | Gate failures (attempts) | Spend this month |', '|---|---|---|---|---|---|---|---|');
  for (const s of d.sites) L.push(`| ${s.domain} | ${state(s.health)} | ${s.publishedThisWeek.length} | ${s.draftsWaiting} | ${s.queue.ready} (${s.queue.daysLeft ?? '–'}) | ${s.queue.blocked} | ${s.gate.failedAttempts} of ${s.gate.attempts}${s.gate.discarded ? `, ${s.gate.discarded} discarded` : ''} | ${usd(s.spendUsd)} |`);
  L.push('');

  const actions = d.sites.filter(s => s.health && (s.health.paused || s.health.multiplier < 1));
  L.push('## 1. Kill-switch actions', '');
  if (!actions.length) L.push('None: every site runs at its normal cadence.');
  for (const s of actions) L.push(`- **${s.domain}** ${s.health.paused ? 'paused' : `slowed x${s.health.multiplier}`}: ${s.health.reasons.join('; ')}`);
  if (d.healthMeta?.dead_man) L.push(`- Dead-man switch: ${d.healthMeta.dead_man.reason}.`);
  for (const n of d.healthMeta?.notes || []) L.push(`- Note: ${n}`);
  L.push('');

  L.push('## 2. Published this week', '');
  const pub = d.sites.flatMap(s => s.publishedThisWeek.map(x => ({ ...x, site: s.domain })));
  if (!pub.length) L.push('Nothing published this week.');
  for (const x of pub.slice(0, 40)) L.push(`- ${x.site} [${x.lang}]: [${x.title}](${x.url})`);
  if (pub.length > 40) L.push(`- … and ${pub.length - 40} more`);
  L.push('');

  L.push('## 3. Gate failures', '');
  const fails = d.sites.filter(s => s.gate.attempts);
  if (!fails.length) L.push('No drafts this week.');
  for (const s of fails) L.push(`- ${s.domain}: ${s.gate.failedAttempts} failed attempt(s) of ${s.gate.attempts}, ${s.gate.discarded} topic(s) discarded${s.gate.topGates.length ? ` · top gates: ${s.gate.topGates.join(', ')}` : ''}`);
  L.push('', 'Details: `data/state/failures.jsonl`. A discarded topic has `status: failed` in its `topics.json`: fix it and set it back to `queued`, or leave it.', '');

  L.push('## 4. Facts to renew (past review_by or due within 14 days)', '');
  if (!d.facts.length) L.push('None.');
  else {
    L.push('| Fact | Field | Date | State | Pages using it |', '|---|---|---|---|---|');
    for (const f of d.facts.slice(0, 60)) L.push(`| \`${f.id}\` | ${f.field} | ${f.date} | ${f.past ? '**PAST**' : 'due'} | ${f.usedBy} |`);
    if (d.facts.length > 60) L.push(`| … ${d.facts.length - 60} more | | | | |`);
  }
  if (d.staleWarnings) L.push('', `${d.staleWarnings} stale-fact warning(s) on live pages (they show « Information en cours de mise à jour »).`);
  L.push('');

  L.push('## 5. Missing-fact requests', '');
  if (!d.missing.length) L.push('None.');
  for (const m of d.missing.slice(0, 30)) L.push(`- ${m.isNew ? '**new** ' : ''}${m.site} (${m.topic_id}): ${m.request}`);
  if (d.missing.length > 30) L.push(`- … and ${d.missing.length - 30} more in \`data/facts/candidates.jsonl\``);
  if (d.otherCandidates) L.push(`- Other fact candidates waiting: ${d.otherCandidates}`);
  L.push('');

  L.push('## 6. Search Console', '');
  const g = d.sites.filter(s => s.gsc);
  if (!g.length) L.push('No Search Console data (GOOGLE_SA_JSON not set, or no property data yet).');
  else {
    L.push('| Site | Impressions 28 d | Clicks 28 d | Last 7 d vs weekly baseline |', '|---|---|---|---|');
    for (const s of g) L.push(`| ${s.domain} | ${s.gsc.last28d?.impressions ?? '–'} | ${s.gsc.last28d?.clicks ?? '–'} | ${s.gsc.trend ? `${s.gsc.trend.impr7d} vs ${s.gsc.trend.baselineWeekly}` : '–'} |`);
  }
  L.push('');

  L.push('## 7. Cannibalisation suspects', '');
  if (!d.cannibal.gsc.length && !d.cannibal.gates.length) L.push('None found.');
  for (const c of d.cannibal.gsc.slice(0, 10)) L.push(`- « ${c.query} » (${c.impressions} impressions): ${c.pages.map(x => `${x.page} ${Math.round(x.share * 100)}%`).join(' / ')}`);
  for (const c of d.cannibal.gates.slice(0, 10)) L.push(`- gate ${c.level}: ${c.site || ''} ${c.file || ''} ${c.msg}`);
  L.push('');

  L.push('## 8. Spend (Claude API, estimate)', '');
  L.push(`Month ${d.spend.month}: **${usd(d.spend.usd)}** of ${d.spend.cap ?? 'no'} USD cap (${Math.round(100 * (d.spend.share || 0))}%)${d.spend.stop ? ' · **cap reached: generation stopped**' : d.spend.alert ? ' · **above the alert level**' : ''}.`);
  if (d.spend.postsThisMonth) L.push(`Posts this month: ${d.spend.postsThisMonth} · ≈ ${usd(d.spend.usd / d.spend.postsThisMonth)} per post.`);
  L.push('Prices in `config/cadence.json` are placeholders until replaced with the current price of the model in CLAUDE_MODEL.', '');

  L.push('## 9. Money site (wikitours.ma)', '');
  L.push('Reminder: we never edit wikitours.ma (DECISIONS D-A). Send this week\'s recommendations for it to the client, and check the M1-M10 dates of STRATEGY 4.6.', '');

  const setup = [];
  if (!d.launchDate) setup.push('Set `launch_date` in `config/cadence.json` to start the ramp.');
  if (d.whatsappMissing.length) setup.push(`WhatsApp number still missing on ${d.whatsappMissing.length} site(s) (\`config/sites/<domain>.json\` → \`whatsapp.number\`).`);
  if (d.gateErrors) setup.push(`**${d.gateErrors} gate error(s) in the network: nothing deploys until they are fixed (\`npm run check\`).**`);
  if (setup.length) { L.push('## 10. Decisions and setup gaps', ''); for (const x of setup) L.push(`- ${x}`); L.push(''); }
  return L.join('\n');
}

export function issueBody(report, d) {
  const checklist = [
    '## Checklist (closing this issue = weekly review done; it resets the dead-man switch)',
    '',
    '- [ ] Read the RED / AMBER lines and confirm or reverse each kill-switch action (`config/killswitch.json`).',
    '- [ ] Search Console: Manual actions and Security issues are clear for every property.',
    '- [ ] Facts: renew, correct or retire every fact listed in section 4; answer the missing-fact requests (`data/facts/registry.json`).',
    '- [ ] Open 3 posts published this week and answer the 6 rubric questions; retire a bad post with `status: retired`.',
    d.mode === 'review' ? `- [ ] Review the drafts in \`data/queue/${d.week.label}.json\` and set \`status: published\` on the ones you approve.` : '- [ ] Auto mode: confirm you still accept publishing without a human read (switch to `review` in `config/cadence.json` if not).',
    '- [ ] Send the wikitours.ma recommendations to the client.',
    '- [ ] Close this issue.',
  ].join('\n');
  const max = 60000 - checklist.length;
  return `${checklist}\n\n---\n\n${report.length > max ? report.slice(0, max) + '\n\n… (truncated: full report in reports/)' : report}`;
}
