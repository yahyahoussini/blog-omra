// Weekly report (STRATEGY 16.7 adapted) from fixture state files, and the review issue (fake GitHub API).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { collectReportData, buildReport, issueBody } from '../scripts/lib/report.js';
import { tmpNetwork, cleanup, alphaTopic, REPO, TODAY } from './lib/tmp-network.js';

after(cleanup);
const run = promisify(execFile);

function fixtureState() {
  const root = tmpNetwork({
    topics: { 'alpha.test': [alphaTopic(), alphaTopic({ id: 'al-fr-0002', status: 'blocked' }), alphaTopic({ id: 'al-fr-0003', status: 'failed' })] },
    health: {
      'alpha.test': { multiplier: 0.5, paused: false, reasons: ['dead-man switch: last weekly review closed 2026-10-05 (15 days > 10)'], notes: [] },
      'beta.test': { multiplier: 1, paused: false, reasons: [], notes: [] },
      _meta: { dead_man: { level: 'slow', reason: 'dead-man switch: last weekly review closed 2026-10-05 (15 days > 10)' }, notes: [] },
    },
  });
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); };
  const jsonl = rows => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  w('data/state/drafts.jsonl', jsonl([
    { date: '2026-10-19', site: 'alpha.test', topic_id: 'al-fr-0003', attempt: 1, ok: false, gates: ['facts'] },
    { date: '2026-10-19', site: 'alpha.test', topic_id: 'al-fr-0003', attempt: 2, ok: false, gates: ['facts', 'links'] },
    { date: '2026-10-12', site: 'beta.test', topic_id: 'old', attempt: 1, ok: false, gates: ['facts'] }, // previous week
  ]));
  w('data/state/failures.jsonl', jsonl([{ date: '2026-10-19', site: 'alpha.test', topic_id: 'al-fr-0003', outcome: 'discarded', attempts: 2, errors: [{ gate: 'facts', msg: 'x' }, { gate: 'links', msg: 'y' }, { gate: 'facts', msg: 'z' }] }]));
  w('data/facts/candidates.jsonl', jsonl([
    { id: 'cand_missing_1', proposed_at: '2026-10-19', kind: 'missing-fact-request', site: 'alpha.test', topic_id: 'al-fr-0003', request: 'délai minimal du vaccin', status: 'requested' },
    { id: 'cand_other', kind: 'claim', status: 'proposed' },
  ]));
  w('data/state/spend.json', JSON.stringify({ months: { '2026-10': { usd_estimate: 9, by_site: { 'alpha.test': 9 } } } }));
  w('data/gsc/alpha.test.json', JSON.stringify({ end_date: '2026-10-19', last28d: { clicks: 12, impressions: 3400 }, trend: { impr7d: 900, baselineWeekly: 800 } }));
  w('data/gsc/cannibalisation.json', JSON.stringify({ suspects: [{ query: 'date test', impressions: 300, pages: [{ page: 'https://alpha.test/a/', share: 0.5 }, { page: 'https://alpha.test/b/', share: 0.4 }] }] }));
  return root;
}

test('report: every section is filled from the state files, nothing from the network', async () => {
  const root = fixtureState();
  const d = await collectReportData({ root, today: TODAY });
  assert.equal(d.week.label, '2026-W43');
  const a = d.sites.find(s => s.domain === 'alpha.test');
  assert.deepEqual([a.queue.ready, a.queue.blocked, a.queue.failed], [1, 1, 1]);
  assert.deepEqual([a.gate.attempts, a.gate.failedAttempts, a.gate.discarded], [2, 2, 1]);
  assert.equal(a.queue.daysLeft, 1);
  const md = buildReport(d);
  assert.match(md, /^# Revue hebdo 2026-W43 \(2026-10-19 → 2026-10-25\)/);
  assert.match(md, /\| alpha\.test \| ● AMBER x0\.5 \| 0 \| 1 \| 1 \(1\) \| 1 \| 2 of 2, 1 discarded \| 9\.00 USD \|/); // brouillon.md = 1 draft waiting
  assert.match(md, /alpha\.test\*\* slowed x0\.5: dead-man switch/);
  assert.match(md, /top gates: facts ×2, links ×1/);
  assert.match(md, /`fact_test_old` \| review_by \| 2026-02-01 \| \*\*PAST\*\*/);
  assert.doesNotMatch(md, /`fact_test_last_visa`/, 'review_by 30 days away: not listed');
  assert.match(md, /Dead-man switch: slow \(last weekly review closed 2026-10-05/);
  assert.match(md, /\*\*new\*\* alpha\.test \(al-fr-0003\): délai minimal du vaccin/);
  assert.match(md, /Other fact candidates waiting: 1/);
  assert.match(md, /\| alpha\.test \| 3400 \| 12 \| 900 vs 800 \|/);
  assert.match(md, /« date test » \(300 impressions\)/);
  assert.match(md, /Month 2026-10: \*\*9\.00 USD\*\* of 10 USD cap \(90%\) · \*\*above the alert level\*\*/);
  assert.match(md, /## 9\. Money site \(wikitours\.ma\)/);
  const body = issueBody(md, d);
  assert.match(body, /closing this issue = weekly review done/);
  assert.match(body, /- \[ \] Close this issue\./);
  assert.match(body, /status: retired/);
});

test('report CLI: writes reports/<YYYY>-W<ww>.md and opens the « Revue hebdo » issue labelled weekly-review', async () => {
  const root = fixtureState();
  const env = { PATH: process.env.PATH };
  let r = await run(process.execPath, [path.join(REPO, 'scripts/report.js'), '--root', root, '--today', TODAY], { env });
  assert.match(r.stdout, /issue: skipped \(GITHUB_TOKEN/);
  assert.ok(fs.existsSync(path.join(root, 'reports/2026-W43.md')));

  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null });
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST' && req.url.endsWith('/labels')) { res.statusCode = 422; return res.end('{"message":"already_exists"}'); }
      if (req.method === 'GET') return res.end('[]');
      res.statusCode = 201; res.end(JSON.stringify({ number: 7, html_url: 'https://github.com/o/r/issues/7' }));
    });
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  try {
    r = await run(process.execPath, [path.join(REPO, 'scripts/report.js'), '--root', root, '--today', TODAY], { env: { ...env, GITHUB_TOKEN: 'x', GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: `http://127.0.0.1:${server.address().port}` } });
    assert.match(r.stdout, /issue created: https:\/\/github\.com\/o\/r\/issues\/7/);
    const post = calls.find(c => c.method === 'POST' && c.url === '/repos/o/r/issues');
    assert.equal(post.body.title, 'Revue hebdo 2026-W43');
    assert.deepEqual(post.body.labels, ['weekly-review']);
    assert.match(post.body.body, /## Checklist/);
  } finally { server.close(); }
});
