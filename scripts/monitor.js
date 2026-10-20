#!/usr/bin/env node
// Daily kill-switch run: internal signals (gate failures, duplicates, stale facts, spend), dead-man switch (GitHub),
// Search Console signals when GOOGLE_SA_JSON is set. Writes data/state/health.json, read by the next generate run.
// Usage: node scripts/monitor.js [--today YYYY-MM-DD] [--root dir]
import path from 'node:path';
import { loadProject } from '../engine/lib/config.js';
import { loadContent } from '../engine/lib/content.js';
import { parseArgs, rootFrom, casablancaToday, readJSON, writeJSON, readJSONL, addDays, hasEnv, paths } from './lib/common.js';
import { spendStatus } from './lib/cadence.js';
import { deadManState, deadManFallback, internalSignals, staleFactShare, evaluateHealth, alertLines } from './lib/killswitch.js';
import { githubFromEnv, latestClosedIssue } from './lib/github.js';
import { parseServiceAccount, accessToken, searchAnalytics, impressionTrend, cannibalSuspects } from './lib/gsc.js';

const args = parseArgs();
const root = rootFrom(args);
const today = args.today || casablancaToday();
const p = paths(root);
const cfg = readJSON(p.killswitch);
const cadence = readJSON(p.cadence);
const project = await loadProject(root);
const sites = [...project.sites.keys()];
const notes = [];

// Dead-man switch: the latest CLOSED issue labelled weekly-review.
let deadMan = null;
const gh = githubFromEnv();
if (gh) {
  try {
    const last = await latestClosedIssue(gh, cfg.dead_man.label);
    deadMan = deadManState({ lastClosedAt: last?.closed_at || null, launchDate: cadence.launch_date, today, cfg: cfg.dead_man });
    if (last) deadMan.issue = last.number;
  } catch (e) {
    // Fail closed: the last known state, then the slow level after repeated failures (killswitch.js deadManFallback).
    deadMan = deadManFallback(readJSON(p.health, {})._meta?.dead_man, cfg.dead_man, e.message);
    notes.push(deadMan.reason);
  }
} else notes.push('dead-man switch not checked: GITHUB_TOKEN / GITHUB_REPOSITORY not set (they are set automatically in GitHub Actions)');

// Internal signals.
const drafts = readJSONL(p.drafts);
const internal = Object.fromEntries(sites.map(s => [s, internalSignals(drafts, s, today, cfg)]));
const facts = staleFactShare(project.registryList, today);
const spend = spendStatus(readJSON(p.spend, { months: {} }), cadence, today);

// Search Console (optional).
const gsc = {};
if (hasEnv('GOOGLE_SA_JSON')) {
  try {
    const token = await accessToken(parseServiceAccount(process.env.GOOGLE_SA_JSON));
    const content = loadContent(project);
    const end = addDays(today, -1);
    const allQueryRows = [];
    for (const site of sites) {
      try {
        const daily = await searchAnalytics(token, site, { startDate: addDays(end, -34), endDate: end, dimensions: ['date'] });
        const pages = await searchAnalytics(token, site, { startDate: addDays(end, -27), endDate: end, dimensions: ['page'] });
        const qp = await searchAnalytics(token, site, { startDate: addDays(end, -27), endDate: end, dimensions: ['query', 'page'] });
        allQueryRows.push(...qp);
        const withImpr = new Set(pages.filter(r => r.impressions > 0).map(r => r.page));
        const eligible = content.filter(x => x.site === site && x.kind === 'posts' && x.fm.status === 'published' && x.fm.date >= addDays(today, -60) && x.fm.date <= addDays(today, -14));
        const url = x => `https://${site}${x.lang === 'fr' ? '' : '/' + x.lang}/blog/${x.fm.slug}/`;
        const trend = impressionTrend(daily, end);
        const totals = pages.reduce((t, r) => ({ clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions }), { clicks: 0, impressions: 0 });
        gsc[site] = { ...trend, eligible: eligible.length, indexProxy: eligible.length ? eligible.filter(x => withImpr.has(url(x))).length / eligible.length : null };
        writeJSON(path.join(p.gscDir, `${site}.json`), { pulled_at: new Date().toISOString(), end_date: end, last28d: totals, trend, daily, top_pages: pages.sort((a, b) => b.impressions - a.impressions).slice(0, 20) });
      } catch (e) { notes.push(`Search Console ${site}: ${e.message}`); }
    }
    writeJSON(path.join(p.gscDir, 'cannibalisation.json'), { pulled_at: new Date().toISOString(), suspects: cannibalSuspects(allQueryRows).slice(0, 50) });
  } catch (e) { notes.push(`Search Console not read: ${e.message}`); }
} else notes.push('Search Console not read: GOOGLE_SA_JSON not set (optional)');

const health = evaluateHealth({ sites, today, cfg, deadMan, internal, gsc, facts, spend });
health._meta.notes.push(...notes);
writeJSON(p.health, health);

const lines = alertLines(health);
console.log(`monitor ${today}: ${sites.filter(s => health[s].paused).length} paused, ${sites.filter(s => !health[s].paused && health[s].multiplier < 1).length} slowed, ${sites.filter(s => health[s].multiplier === 1).length} normal.`);
if (deadMan) console.log(`dead-man switch: ${deadMan.reason}`);
for (const l of lines) console.log(l);
console.log('Written: data/state/health.json');
