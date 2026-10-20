// Cadence math (DECISIONS D-C + D-H): ramp from launch_date, ceiling, kill-switch multiplier, weekly cap, spend cap.
import { daysBetween, monthOf } from './common.js';

// Posts per day the ramp allows on ramp day `day` (1 = launch day).
export function rampPerDay(cadence, day) {
  const ceiling = cadence.max_posts_per_day_per_site ?? 3;
  const steps = [...(cadence.ramp || [])].sort((a, b) => a.from_day - b.from_day);
  let perDay = 0;
  for (const s of steps) if (day >= s.from_day) perDay = s.per_day;
  return Math.max(0, Math.min(ceiling, perDay));
}

/**
 * Today's quota for one site.
 * @param {object} o
 * @param {object} o.cadence      config/cadence.json
 * @param {string} o.site         domain
 * @param {string} o.today        YYYY-MM-DD (Africa/Casablanca)
 * @param {object} [o.health]     data/state/health.json
 * @param {number} [o.postsToday] posts of this site already dated today
 * @param {number} [o.postsThisWeek] posts of this site dated in the current ISO week
 * @param {boolean} [o.simulateLaunch] dry runs: treat a missing launch_date as day 1
 * @returns {{ quota:number, perDay:number, day:number|null, multiplier:number, reasons:string[] }}
 */
export function siteQuota({ cadence, site, today, health = {}, postsToday = 0, postsThisWeek = 0, simulateLaunch = false }) {
  const reasons = [];
  const none = (why, extra = {}) => ({ quota: 0, perDay: 0, day: null, multiplier: 0, reasons: [...reasons, why], ...extra });
  if (cadence.paused) return none('paused in config/cadence.json');
  const siteCfg = cadence.sites?.[site] ?? {};
  if (siteCfg.enabled === false) return none('site disabled in config/cadence.json');
  let day;
  if (!cadence.launch_date) {
    if (!simulateLaunch) return none('launch_date is not set in config/cadence.json');
    day = 1; reasons.push('launch_date not set: simulating ramp day 1 (dry run)');
  } else {
    day = daysBetween(cadence.launch_date, today) + 1;
    if (day < 1) return none(`before launch (${cadence.launch_date})`);
  }
  let perDay = rampPerDay(cadence, day);
  if (siteCfg.max_per_day != null) perDay = Math.min(perDay, siteCfg.max_per_day);
  const h = health[site] || {};
  const multiplier = h.paused ? 0 : (typeof h.multiplier === 'number' ? h.multiplier : 1);
  if (multiplier <= 0) return none(`paused by kill-switch: ${(h.reasons || []).join('; ') || 'see data/state/health.json'}`, { perDay, day });
  let quota = perDay - postsToday;
  // STRATEGY 16.5: slowed caps are weekly, so halving never turns a small daily cap into a silent pause.
  if (multiplier < 1) {
    const weeklyCap = Math.floor(perDay * 7 * multiplier);
    quota = Math.min(quota, weeklyCap - postsThisWeek);
    reasons.push(`kill-switch x${multiplier}: weekly cap ${weeklyCap} (${(h.reasons || []).join('; ')})`);
  }
  return { quota: Math.max(0, quota), perDay, day, multiplier, reasons };
}

// D-H: at most `max_posts_per_language_per_day` per language and site per day.
export function languageSlots(cadence, postsTodayByLang = {}) {
  const max = cadence.max_posts_per_language_per_day ?? 1;
  return lang => Math.max(0, max - (postsTodayByLang[lang] || 0));
}

// Expected posts per day once the queue is consumed (planning): current ramp step x multiplier, at least 1.
export function planningPerDay({ cadence, site, today, health = {} }) {
  const q = siteQuota({ cadence, site, today, health, simulateLaunch: true });
  if (cadence.paused || cadence.sites?.[site]?.enabled === false) return 0;
  return Math.max(1, (q.perDay || 1) * (q.multiplier || 1));
}

// ---------- spend ----------
export function priceOf(cadence) {
  const p = cadence.claude?.price_usd_per_mtok || {};
  const input = p.input ?? 0;
  return { input, output: p.output ?? 0, cache_write: p.cache_write ?? input * 1.25, cache_read: p.cache_read ?? input * 0.1 };
}

export function usageCost(usage, price) {
  const u = k => usage?.[k] || 0;
  return (u('input_tokens') * price.input + u('output_tokens') * price.output +
    u('cache_creation_input_tokens') * price.cache_write + u('cache_read_input_tokens') * price.cache_read) / 1e6;
}

// Adds one API call's usage to data/state/spend.json (mutates and returns it).
export function addSpend(spend, usage, { today, cadence, purpose = 'generate', site = null }) {
  const month = monthOf(today);
  spend.months ??= {};
  const m = spend.months[month] ??= { calls: 0, input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, usd_estimate: 0, by_purpose: {}, by_site: {} };
  const usd = usageCost(usage, priceOf(cadence));
  m.calls++;
  for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) m[k] += usage?.[k] || 0;
  m.usd_estimate = round(m.usd_estimate + usd);
  m.by_purpose[purpose] = round((m.by_purpose[purpose] || 0) + usd);
  if (site) m.by_site[site] = round((m.by_site[site] || 0) + usd);
  spend.price_basis = { ...priceOf(cadence), note: 'USD per million tokens, from config/cadence.json (estimate, not an invoice)' };
  spend.updated_at = new Date().toISOString();
  return usd;
}

export function spendStatus(spend, cadence, today) {
  const cap = cadence.monthly_spend_cap_usd ?? null;
  const usd = spend.months?.[monthOf(today)]?.usd_estimate || 0;
  const share = cap ? usd / cap : 0;
  return { month: monthOf(today), usd, cap, share, alert: !!cap && share >= (cadence.spend_alert_share ?? 0.8), stop: !!cap && usd >= cap };
}

const round = x => Math.round(x * 10000) / 10000;
