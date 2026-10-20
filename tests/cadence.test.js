// Cadence math (DECISIONS D-C + D-H): ramp, ceiling, enable flags, kill-switch multiplier, spend cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rampPerDay, siteQuota, languageSlots, planningPerDay, addSpend, spendStatus, usageCost, priceOf } from '../scripts/lib/cadence.js';
import { isoWeek, casablancaToday, daysBetween } from '../scripts/lib/common.js';
import { baseCadence } from './lib/tmp-network.js';

const S = 'alpha.test';
const cad = (extra = {}) => ({ ...baseCadence(), launch_date: '2026-11-01', ...extra });

test('ramp: 1/day on days 1-14, 2/day on days 15-28, 3/day from day 29, never above the ceiling', () => {
  const c = cad();
  assert.equal(rampPerDay(c, 0), 0);
  assert.equal(rampPerDay(c, 1), 1);
  assert.equal(rampPerDay(c, 14), 1);
  assert.equal(rampPerDay(c, 15), 2);
  assert.equal(rampPerDay(c, 28), 2);
  assert.equal(rampPerDay(c, 29), 3);
  assert.equal(rampPerDay(c, 400), 3);
  assert.equal(rampPerDay({ ...c, ramp: [{ from_day: 1, per_day: 9 }] }, 1), 3, 'ceiling 3');
  assert.equal(rampPerDay({ ...c, max_posts_per_day_per_site: 2 }, 40), 2);
});

test('quota follows the launch date (day 1 = launch day, Africa/Casablanca dates)', () => {
  const q = today => siteQuota({ cadence: cad(), site: S, today });
  assert.equal(q('2026-10-31').quota, 0);
  assert.match(q('2026-10-31').reasons[0], /before launch/);
  assert.deepEqual([q('2026-11-01').day, q('2026-11-01').quota], [1, 1]);
  assert.deepEqual([q('2026-11-15').day, q('2026-11-15').quota], [15, 2]);
  assert.deepEqual([q('2026-11-29').day, q('2026-11-29').quota], [29, 3]);
  assert.equal(siteQuota({ cadence: cad(), site: S, today: '2026-11-29', postsToday: 2 }).quota, 1);
  assert.equal(siteQuota({ cadence: cad(), site: S, today: '2026-11-29', postsToday: 5 }).quota, 0);
  assert.equal(daysBetween('2026-11-01', '2026-11-29'), 28);
});

test('no launch date, global pause and per-site enable flag all give zero', () => {
  let q = siteQuota({ cadence: cad({ launch_date: null }), site: S, today: '2026-11-01' });
  assert.equal(q.quota, 0); assert.match(q.reasons[0], /launch_date is not set/);
  q = siteQuota({ cadence: cad({ launch_date: null }), site: S, today: '2026-11-01', simulateLaunch: true });
  assert.equal(q.quota, 1, 'dry runs simulate day 1');
  q = siteQuota({ cadence: cad({ paused: true }), site: S, today: '2026-12-01' });
  assert.equal(q.quota, 0); assert.match(q.reasons[0], /paused/);
  q = siteQuota({ cadence: cad({ sites: { [S]: { enabled: false } } }), site: S, today: '2026-12-01' });
  assert.equal(q.quota, 0); assert.match(q.reasons[0], /disabled/);
  q = siteQuota({ cadence: cad({ sites: { [S]: { enabled: true, max_per_day: 1 } } }), site: S, today: '2026-12-01' });
  assert.equal(q.quota, 1);
});

test('kill-switch: paused = 0; a multiplier below 1 becomes a weekly cap (never a silent pause)', () => {
  const today = '2026-12-01'; // day 31 -> 3/day
  let q = siteQuota({ cadence: cad(), site: S, today, health: { [S]: { paused: true, multiplier: 0, reasons: ['dead-man switch'] } } });
  assert.equal(q.quota, 0); assert.match(q.reasons[0], /dead-man switch/);
  const h = { [S]: { paused: false, multiplier: 0.5, reasons: ['gate failures'] } };
  q = siteQuota({ cadence: cad(), site: S, today, health: h });
  assert.equal(q.quota, 3, 'weekly cap floor(3*7*0.5)=10, nothing used yet');
  q = siteQuota({ cadence: cad(), site: S, today, health: h, postsThisWeek: 9 });
  assert.equal(q.quota, 1);
  q = siteQuota({ cadence: cad(), site: S, today, health: h, postsThisWeek: 10 });
  assert.equal(q.quota, 0);
  // Ramp day 1 (1/day) halved: 3 posts a week, not zero.
  q = siteQuota({ cadence: cad(), site: S, today: '2026-11-01', health: h, postsThisWeek: 2 });
  assert.equal(q.quota, 1);
  assert.equal(siteQuota({ cadence: cad(), site: S, today, health: { other: { paused: true } } }).quota, 3, 'other sites do not matter');
});

test('D-H language slots: one post per language and site per day', () => {
  const slots = languageSlots(cad(), { fr: 1 });
  assert.equal(slots('fr'), 0);
  assert.equal(slots('ar'), 1);
  assert.equal(planningPerDay({ cadence: cad({ launch_date: null }), site: S, today: '2026-11-01' }), 1);
  assert.equal(planningPerDay({ cadence: cad(), site: S, today: '2026-12-01' }), 3);
  assert.equal(planningPerDay({ cadence: cad({ paused: true }), site: S, today: '2026-12-01' }), 0);
});

test('spend: usage is priced from config, accumulated per month, and the cap stops generation', () => {
  const c = cad({ monthly_spend_cap_usd: 1.4 });
  const usage = { input_tokens: 10000, output_tokens: 20000, cache_creation_input_tokens: 4000, cache_read_input_tokens: 8000 };
  const usd = usageCost(usage, priceOf(c));
  assert.equal(usd, (10000 * 5 + 20000 * 25 + 4000 * 6.25 + 8000 * 0.5) / 1e6);
  const spend = { months: {} };
  addSpend(spend, usage, { today: '2026-11-03', cadence: c, site: S });
  addSpend(spend, usage, { today: '2026-11-04', cadence: c, site: S, purpose: 'plan' });
  const m = spend.months['2026-11'];
  assert.equal(m.calls, 2); assert.equal(m.output_tokens, 40000);
  assert.ok(Math.abs(m.usd_estimate - 2 * usd) < 1e-9);
  assert.ok(m.by_purpose.plan > 0 && m.by_site[S] > 0);
  let st = spendStatus(spend, c, '2026-11-20');
  assert.equal(st.stop, false); assert.equal(st.alert, true); // 1.158 of 1.4 USD = 83 % (alert at 80 %)
  st = spendStatus(spend, { ...c, monthly_spend_cap_usd: 1 }, '2026-11-20');
  assert.equal(st.stop, true);
  assert.equal(spendStatus(spend, c, '2026-12-01').usd, 0, 'a new month starts at zero');
});

test('dates: ISO week labels and the Casablanca calendar day', () => {
  assert.deepEqual(isoWeek('2026-10-20'), { year: 2026, week: 43, label: '2026-W43', monday: '2026-10-19', sunday: '2026-10-25' });
  assert.equal(isoWeek('2027-01-01').label, '2026-W53');
  assert.equal(isoWeek('2029-12-31').label, '2030-W01');
  // 23:30 UTC on 31 Dec is already 1 Jan in Morocco (UTC+1).
  assert.equal(casablancaToday(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
});
