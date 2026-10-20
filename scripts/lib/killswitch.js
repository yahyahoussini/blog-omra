// Kill-switch evaluation (STRATEGY 16.5 adapted by DECISIONS D-C). Scale-down is automatic; resume is human.
// Pure functions: monitor.js collects the signals, the tests feed fixtures.
import { daysBetween, addDays } from './common.js';

// Dead-man switch: days since the last closed weekly-review issue (or since launch when none was ever closed).
export function deadManState({ lastClosedAt = null, launchDate = null, today, cfg }) {
  const since = lastClosedAt ? lastClosedAt.slice(0, 10) : launchDate;
  if (!since) return { level: 'ok', multiplier: 1, days: null, reason: 'not started (no launch_date and no closed weekly review)' };
  const days = daysBetween(since, today);
  const ref = lastClosedAt ? `last weekly review closed ${since}` : `no weekly review closed since launch ${since}`;
  if (days > cfg.pause_after_days) return { level: 'paused', multiplier: 0, days, reason: `dead-man switch: ${ref} (${days} days > ${cfg.pause_after_days})` };
  if (days > cfg.slow_after_days) return { level: 'slow', multiplier: cfg.slow_multiplier, days, reason: `dead-man switch: ${ref} (${days} days > ${cfg.slow_after_days})` };
  return { level: 'ok', multiplier: 1, days, reason: ref };
}

// The GitHub check failed: never fail open. Reuse the last known state (it can only get worse), and after
// cfg.unchecked_slow_after_days consecutive unchecked days apply at least the slow level.
export function deadManFallback(prev, cfg, error) {
  const unchecked = (prev?.unchecked_days || 0) + 1;
  const base = prev && prev.level ? { ...prev } : { level: 'ok', multiplier: 1, days: null };
  const out = { ...base, unchecked_days: unchecked, reason: `dead-man switch not checked (${error}); ${unchecked} day(s) in a row, using the last known state: ${prev?.reason || 'none'}` };
  if (unchecked >= (cfg.unchecked_slow_after_days ?? 2) && out.multiplier > cfg.slow_multiplier) Object.assign(out, { level: 'slow', multiplier: cfg.slow_multiplier });
  return out;
}

// Internal signals per site from data/state/drafts.jsonl (one line per draft attempt).
export function internalSignals(drafts, site, today, cfg) {
  const from = addDays(today, -(cfg.gate_failure.window_days - 1));
  const recent = drafts.filter(d => d.site === site && d.date >= from && d.date <= today);
  const failed = recent.filter(d => !d.ok).length;
  const passed = drafts.filter(d => d.site === site && d.ok && typeof d.nearest_dup === 'number').slice(-cfg.similarity.last_n_posts);
  return {
    attempts7d: recent.length, failed7d: failed, failRate7d: recent.length ? failed / recent.length : null,
    meanNearestDup: passed.length ? passed.reduce((s, d) => s + d.nearest_dup, 0) / passed.length : null, dupSample: passed.length,
    dupBlocks7d: recent.filter(d => (d.gates || []).includes('duplicate')).length,
  };
}

export function staleFactShare(registryList, today) {
  const approved = registryList.filter(f => f.status === 'approved');
  const stale = approved.filter(f => (f.review_by && f.review_by < today) || (f.valid_until && f.valid_until < today));
  return { share: approved.length ? stale.length / approved.length : 0, stale: stale.map(f => f.id), approved: approved.length };
}

const inDip = (dips, site, today) => (dips || []).some(d => d.from <= today && today <= d.to && (!d.sites || d.sites.includes(site)));

/**
 * @param {object} o
 * @param {string[]} o.sites
 * @param {string} o.today
 * @param {object} o.cfg       config/killswitch.json
 * @param {object} o.deadMan   deadManState(...) or null when it could not be checked
 * @param {object} o.internal  { site: internalSignals(...) }
 * @param {object} o.gsc       { site: { impr7d, baselineWeekly, indexProxy, eligible } } (optional)
 * @param {object} o.facts     staleFactShare(...)
 * @param {object} [o.spend]   spendStatus(...)
 * @returns data/state/health.json content
 */
export function evaluateHealth({ sites, today, cfg, deadMan, internal = {}, gsc = {}, facts, spend = null }) {
  const health = {};
  const notes = [];
  const crashes = [];
  for (const site of sites) {
    const hits = [], siteNotes = [];
    const hit = (multiplier, reason) => hits.push({ multiplier, reason });
    if (cfg.network_freeze) hit(0, 'network freeze (config/killswitch.json)');
    const manual = cfg.manual?.[site];
    if (manual?.paused) hit(0, `manual pause: ${manual.reason || 'config/killswitch.json'}`);
    else if (typeof manual?.multiplier === 'number') hit(manual.multiplier, `manual multiplier: ${manual.reason || 'config/killswitch.json'}`);
    if (deadMan && deadMan.level !== 'ok') hit(deadMan.multiplier, deadMan.reason);
    const s = internal[site];
    if (s) {
      if (s.attempts7d >= cfg.gate_failure.min_attempts && s.failRate7d > cfg.gate_failure.slow_rate)
        hit(cfg.gate_failure.slow_multiplier, `gate failure rate ${Math.round(100 * s.failRate7d)}% of ${s.attempts7d} drafts in ${cfg.gate_failure.window_days} days > ${Math.round(100 * cfg.gate_failure.slow_rate)}% (prompt/registry issue?)`);
      if (s.meanNearestDup != null && s.meanNearestDup > cfg.similarity.slow_mean) hit(cfg.similarity.slow_multiplier, `similarity drift: mean nearest-duplicate ${s.meanNearestDup.toFixed(2)} over ${s.dupSample} posts > ${cfg.similarity.slow_mean}`);
      if (s.dupBlocks7d >= cfg.similarity.dup_blocks_7d) hit(cfg.similarity.slow_multiplier, `${s.dupBlocks7d} duplicate blocks in 7 days (cluster exhaustion?)`);
    }
    if (facts && facts.share > cfg.facts.stale_registry_share_pause) hit(0, `maintenance mode: ${Math.round(100 * facts.share)}% of approved facts are past review_by (> ${Math.round(100 * cfg.facts.stale_registry_share_pause)}%): renew them in data/facts/registry.json`);
    const g = gsc[site];
    if (g) {
      if (g.baselineWeekly >= cfg.impressions.min_baseline_weekly && g.impr7d < cfg.impressions.crash_ratio * g.baselineWeekly) {
        if (inDip(cfg.seasonal_dips, site, today)) siteNotes.push(`impressions dropped (${g.impr7d} vs ${g.baselineWeekly}/week) inside an expected seasonal dip`);
        else { hit(0, `impressions crash: ${g.impr7d} in 7 days vs ${g.baselineWeekly}/week baseline`); crashes.push(site); }
      }
      if (g.indexProxy != null && g.eligible >= cfg.index_proxy.min_eligible) {
        const msg = `index proxy ${Math.round(100 * g.indexProxy)}% of ${g.eligible} posts aged 14-60 days have impressions`;
        if (!cfg.index_proxy.enforced) siteNotes.push(`${msg} (report only)`);
        else if (g.indexProxy < cfg.index_proxy.pause_below) hit(0, msg);
        else if (g.indexProxy < cfg.index_proxy.slow_below) hit(0.5, msg);
      }
    }
    const multiplier = hits.length ? Math.min(...hits.map(h => h.multiplier)) : 1;
    health[site] = { multiplier, paused: multiplier <= 0, reasons: hits.map(h => h.reason), notes: siteNotes, signals: { ...(s || {}), ...(g ? { gsc: g } : {}) } };
  }
  if (crashes.length >= cfg.impressions.sites_for_network_freeze) {
    for (const site of sites) {
      health[site].multiplier = 0; health[site].paused = true;
      health[site].reasons.push(`network freeze: impressions crash on ${crashes.join(', ')} in the same week (check the Google Search Status Dashboard)`);
    }
  }
  if (spend?.stop) notes.push(`Claude API spend cap reached (${spend.usd.toFixed(2)} / ${spend.cap} USD): generation stopped until next month`);
  else if (spend?.alert) notes.push(`Claude API spend at ${Math.round(100 * spend.share)}% of the monthly cap`);
  health._meta = { generated_at: new Date().toISOString(), today, dead_man: deadMan, stale_facts: facts ? { share: facts.share, count: facts.stale.length } : null, spend, notes };
  return health;
}

// Human-readable alert lines for the console / report.
export function alertLines(health) {
  const lines = [];
  for (const [site, h] of Object.entries(health)) {
    if (site.startsWith('_')) continue;
    if (h.paused) lines.push(`RED   ${site}: paused: ${h.reasons.join('; ')}`);
    else if (h.multiplier < 1) lines.push(`AMBER ${site}: slowed x${h.multiplier}: ${h.reasons.join('; ')}`);
    for (const n of h.notes || []) lines.push(`INFO  ${site}: ${n}`);
  }
  for (const n of health._meta?.notes || []) lines.push(`ALERT network: ${n}`);
  return lines;
}
