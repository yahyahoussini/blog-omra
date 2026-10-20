// Kill-switches (STRATEGY 16.5 adapted) and the dead-man switch (DECISIONS D-C), without network access.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deadManState, internalSignals, staleFactShare, evaluateHealth, alertLines } from '../scripts/lib/killswitch.js';
import { githubFromEnv, latestClosedIssue } from '../scripts/lib/github.js';
import { signJwt, impressionTrend, cannibalSuspects } from '../scripts/lib/gsc.js';
import { siteQuota } from '../scripts/lib/cadence.js';
import { tmpNetwork, cleanup, readJson, baseCadence, REPO, TODAY } from './lib/tmp-network.js';

after(cleanup);
const cfg = readJson(REPO, 'config/killswitch.json');
const sites = ['alpha.test', 'beta.test'];
const run = promisify(execFile);

test('dead-man switch: > 10 days without a closed weekly review halves, > 21 days pauses', () => {
  const dm = (lastClosedAt, launchDate = '2026-09-01') => deadManState({ lastClosedAt, launchDate, today: '2026-11-01', cfg: cfg.dead_man });
  assert.equal(dm('2026-10-25T09:00:00Z').level, 'ok');
  assert.equal(dm('2026-10-22T09:00:00Z').level, 'ok');         // 10 days: not yet
  assert.deepEqual([dm('2026-10-21T09:00:00Z').level, dm('2026-10-21T09:00:00Z').multiplier], ['slow', 0.5]); // 11 days
  assert.equal(dm('2026-10-11T09:00:00Z').level, 'slow');       // 21 days
  assert.deepEqual([dm('2026-10-10T09:00:00Z').level, dm('2026-10-10T09:00:00Z').multiplier], ['paused', 0]); // 22 days
  // Never closed: counted from the launch date; before launch nothing happens.
  assert.equal(dm(null, '2026-10-25').level, 'ok');
  assert.equal(dm(null, '2026-10-15').level, 'slow');
  assert.match(dm(null, '2026-10-15').reason, /no weekly review closed since launch/);
  assert.equal(dm(null, null).level, 'ok');
});

test('health: the strictest signal wins; dead-man pause stops every site; reasons are kept', () => {
  const dead = deadManState({ lastClosedAt: '2026-10-01T00:00:00Z', today: '2026-11-01', cfg: cfg.dead_man });
  const h = evaluateHealth({ sites, today: '2026-11-01', cfg, deadMan: dead, facts: { share: 0, stale: [] } });
  for (const s of sites) { assert.equal(h[s].paused, true); assert.match(h[s].reasons[0], /dead-man/); }
  assert.equal(siteQuota({ cadence: { ...baseCadence(), launch_date: '2026-09-01' }, site: 'alpha.test', today: '2026-11-01', health: h }).quota, 0);

  const drafts = [
    ...Array.from({ length: 4 }, (_, i) => ({ site: 'alpha.test', date: '2026-10-30', ok: i === 0, gates: ['facts'], nearest_dup: null })),
    { site: 'beta.test', date: '2026-10-31', ok: true, nearest_dup: 0.31 },
    { site: 'beta.test', date: '2026-10-20', ok: false, gates: ['duplicate'] }, // outside the 7-day window
  ];
  const internal = Object.fromEntries(sites.map(s => [s, internalSignals(drafts, s, '2026-11-01', cfg)]));
  assert.deepEqual([internal['alpha.test'].attempts7d, internal['alpha.test'].failed7d], [4, 3]);
  const h2 = evaluateHealth({ sites, today: '2026-11-01', cfg: { ...cfg, manual: { 'beta.test': { multiplier: 0.5, reason: 'test' } } }, deadMan: null, internal, facts: { share: 0, stale: [] }, spend: { stop: true, usd: 151, cap: 150 } });
  assert.equal(h2['alpha.test'].multiplier, 0.5); assert.match(h2['alpha.test'].reasons[0], /gate failure rate 75%/);
  assert.equal(h2['beta.test'].multiplier, 0.5); assert.equal(h2['beta.test'].reasons.length, 2); // manual + similarity drift
  assert.match(h2._meta.notes[0], /spend cap reached/);
  const lines = alertLines(h2);
  assert.ok(lines.some(l => l.startsWith('AMBER alpha.test')));
  assert.ok(lines.some(l => l.startsWith('ALERT network')));
});

test('health: freezes, stale registry, impressions crash (except in a seasonal dip), index proxy report-only', () => {
  let h = evaluateHealth({ sites, today: '2026-11-01', cfg: { ...cfg, network_freeze: true }, deadMan: null, facts: { share: 0, stale: [] } });
  assert.ok(sites.every(s => h[s].paused));
  h = evaluateHealth({ sites, today: '2026-11-01', cfg, deadMan: null, facts: { share: 0.5, stale: ['a'] } });
  assert.match(h['alpha.test'].reasons[0], /maintenance mode/);
  const crash = { impr7d: 100, baselineWeekly: 1000, indexProxy: 0.4, eligible: 30 };
  h = evaluateHealth({ sites, today: '2026-11-01', cfg, deadMan: null, facts: { share: 0, stale: [] }, gsc: { 'alpha.test': crash } });
  assert.equal(h['alpha.test'].paused, true); assert.equal(h['beta.test'].paused, false);
  assert.match(h['alpha.test'].notes[0], /index proxy 40%.*report only/);
  h = evaluateHealth({ sites, today: '2026-11-01', cfg, deadMan: null, facts: { share: 0, stale: [] }, gsc: { 'alpha.test': crash, 'beta.test': crash } });
  assert.ok(h['beta.test'].reasons.some(r => /network freeze/.test(r)));
  h = evaluateHealth({ sites, today: '2026-11-01', cfg: { ...cfg, seasonal_dips: [{ from: '2026-10-25', to: '2026-11-05' }] }, deadMan: null, facts: { share: 0, stale: [] }, gsc: { 'alpha.test': crash } });
  assert.equal(h['alpha.test'].paused, false);
  assert.equal(staleFactShare([{ status: 'approved', review_by: '2026-10-01' }, { status: 'approved', review_by: '2027-01-01' }, { status: 'proposed', review_by: '2020-01-01' }], '2026-11-01').share, 0.5);
});

test('Search Console helpers: RS256 JWT signed with node:crypto, impressions trend, cannibalisation suspects', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'bot@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const jwt = signJwt(sa, { now: 1000 });
  const [h, c, sig] = jwt.split('.');
  assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url')));
  const claim = JSON.parse(Buffer.from(c, 'base64url'));
  assert.deepEqual([claim.iss, claim.exp, claim.aud], [sa.client_email, 4600, 'https://oauth2.googleapis.com/token']);
  const daily = Array.from({ length: 35 }, (_, i) => { const d = new Date(Date.UTC(2026, 9, 31 - i, 12)); return { date: d.toISOString().slice(0, 10), impressions: i < 7 ? 10 : 100 }; });
  assert.deepEqual(impressionTrend(daily, '2026-10-31'), { impr7d: 70, baselineWeekly: 700, ratio: 0.1 });
  const rows = [
    { query: 'q', page: 'https://a/1', impressions: 50 }, { query: 'q', page: 'https://b/2', impressions: 40 }, { query: 'q', page: 'https://a/3', impressions: 10 },
    { query: 'solo', page: 'https://a/1', impressions: 90 },
  ];
  assert.deepEqual(cannibalSuspects(rows).map(s => [s.query, s.pages.length]), [['q', 2]]);
});

// A fake GitHub API for the dead-man switch.
function fakeGithub(issues) {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, auth: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url.includes('state=closed') ? issues : []));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, seen, url: `http://127.0.0.1:${server.address().port}` })));
}

test('GitHub: latest CLOSED weekly-review issue (pull requests ignored)', async () => {
  const gh = await fakeGithub([
    { number: 3, title: 'Revue hebdo 2026-W42', closed_at: '2026-10-19T08:00:00Z' },
    { number: 5, title: 'Revue hebdo 2026-W43', closed_at: '2026-10-26T08:00:00Z' },
    { number: 9, title: 'a PR', closed_at: '2026-10-30T08:00:00Z', pull_request: {} },
  ]);
  try {
    const cfgGh = githubFromEnv({ GITHUB_TOKEN: 't0k', GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: gh.url });
    const last = await latestClosedIssue(cfgGh, 'weekly-review');
    assert.deepEqual([last.number, last.closed_at], [5, '2026-10-26T08:00:00Z']);
    assert.match(gh.seen[0].url, /^\/repos\/o\/r\/issues\?state=closed&labels=weekly-review/);
    assert.equal(gh.seen[0].auth, 'Bearer t0k');
    assert.equal(githubFromEnv({ GITHUB_TOKEN: '', GITHUB_REPOSITORY: 'o/r' }), null);
  } finally { gh.server.close(); }
});

test('monitor CLI: writes data/state/health.json; the dead-man switch pauses after 21 days', async () => {
  const root = tmpNetwork({ cadence: { launch_date: '2026-09-01' } });
  const env = { PATH: process.env.PATH };
  let r = await run(process.execPath, [path.join(REPO, 'scripts/monitor.js'), '--root', root, '--today', TODAY], { env });
  assert.match(r.stdout, /dead-man switch not checked/);
  let h = readJson(root, 'data/state/health.json');
  // The fixture registry has 1 stale fact of 4 approved (25 % > 20 %): maintenance mode, no dead-man reason.
  assert.deepEqual(h['alpha.test'].reasons.map(x => x.split(':')[0]), ['maintenance mode']);

  const gh = await fakeGithub([{ number: 1, title: 'Revue hebdo 2026-W39', closed_at: '2026-09-25T10:00:00Z' }]);
  try {
    r = await run(process.execPath, [path.join(REPO, 'scripts/monitor.js'), '--root', root, '--today', TODAY], { env: { ...env, GITHUB_TOKEN: 'x', GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: gh.url } });
    assert.match(r.stdout, /RED {3}alpha\.test: paused: dead-man switch: last weekly review closed 2026-09-25 \(25 days > 21\)/);
    h = readJson(root, 'data/state/health.json');
    assert.equal(h['beta.test'].paused, true);
    assert.equal(h._meta.dead_man.issue, 1);
  } finally { gh.server.close(); }
});
