// Generator pipeline on the fixture network with a stubbed model (no network), plus the --dry-run CLI.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runGenerate } from '../scripts/lib/generator.js';
import { normalizeDraft, briefChecks, missingRequests } from '../scripts/lib/draft-gate.js';
import { tmpNetwork, cleanup, readJson, readLines, alphaTopic, GOOD_DRAFT, BAD_DRAFT, TODAY, REPO } from './lib/tmp-network.js';

after(cleanup);
const quiet = () => {};
const usage = { input_tokens: 1000, output_tokens: 2000, cache_creation_input_tokens: 0, cache_read_input_tokens: 500 };
// Claims verifier stub (gate 3): every claim maps to a brief fact unless `claims` says otherwise.
const verifier = (claims = [{ claim: 'dernière délivrance le 9 mars 2027', fact_ids: ['fact_test_last_visa'] }]) => {
  const fn = async ({ format }) => { fn.calls.push(format); const text = JSON.stringify({ claims }); return { text, content: [{ type: 'text', text }], usage, stopReason: 'end_turn' }; };
  fn.calls = [];
  return fn;
};
const gen = o => runGenerate({ verifyFn: verifier(), ...o });
const stub = (...texts) => {
  const calls = [];
  const fn = async ({ system, messages }) => { calls.push({ system, messages }); const text = texts[Math.min(calls.length - 1, texts.length - 1)]; return { text, content: [{ type: 'text', text }], usage, stopReason: 'end_turn' }; };
  fn.calls = calls;
  return fn;
};

test('auto mode: a passing draft is written as published today, the topic is done, spend is tracked', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  const draftFn = stub(GOOD_DRAFT);
  const s = await gen({ root, today: TODAY, draftFn, log: quiet });
  assert.equal(s.written.length, 1, JSON.stringify(readLines(root, 'data/state/failures.jsonl')));
  const file = path.join(root, 'content/alpha.test/fr/posts/derniere-date-utile.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /status: published/);
  assert.match(text, /date: '?2026-10-20'?/);
  assert.match(text, /concept_id: test_last_date/);
  assert.doesNotMatch(text, /reviewed_by/); // the model cannot claim a review
  assert.doesNotMatch(text, /ignored-by-the-generator/);
  assert.equal(readJson(root, 'content/alpha.test/topics.json')[0].status, 'done');
  const spend = readJson(root, 'data/state/spend.json');
  assert.equal(spend.months['2026-10'].calls, 2); // draft + claims verifier
  assert.equal(spend.months['2026-10'].usd_estimate, 2 * (1000 * 5 + 2000 * 25 + 500 * 0.5) / 1e6);
  assert.equal(draftFn.calls.length, 1);
  assert.match(draftFn.calls[0].system, /\[\[fact:<id>\]\]/);
  assert.match(draftFn.calls[0].messages[0].content, /"fact_test_last_visa"/);
  const drafts = readLines(root, 'data/state/drafts.jsonl');
  assert.equal(drafts.length, 1); assert.equal(drafts[0].ok, true); assert.equal(typeof drafts[0].nearest_dup, 'number');
});

test('one revision: gate errors are fed back, the second draft passes', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  const draftFn = stub(BAD_DRAFT, GOOD_DRAFT);
  const s = await gen({ root, today: TODAY, draftFn, log: quiet });
  assert.equal(s.written.length, 1);
  assert.equal(draftFn.calls.length, 2);
  const second = draftFn.calls[1].messages;
  assert.equal(second[1].role, 'assistant');
  assert.match(second[2].content, /rule-word-without-fact|digits-without-fact/);
  assert.match(second[2].content, /MISSING/);
  // MISSING requests are kept as fact candidates even when the revision passes.
  assert.equal(readLines(root, 'data/facts/candidates.jsonl').filter(c => c.kind === 'missing-fact-request').length, 1);
});

test('two failures: discarded, logged, topic failed, MISSING requests become candidates', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  const s = await gen({ root, today: TODAY, draftFn: stub(BAD_DRAFT), log: quiet });
  assert.equal(s.failed.length, 1);
  assert.ok(!fs.existsSync(path.join(root, 'content/alpha.test/fr/posts/derniere-date-utile.md')));
  const topic = readJson(root, 'content/alpha.test/topics.json')[0];
  assert.equal(topic.status, 'failed');
  assert.ok(topic.last_errors.length);
  const f = readLines(root, 'data/state/failures.jsonl');
  assert.equal(f[0].outcome, 'discarded');
  assert.deepEqual(f[0].missing, ['délai minimal du vaccin avant le départ']);
  const c = readLines(root, 'data/facts/candidates.jsonl').filter(x => x.kind === 'missing-fact-request');
  assert.equal(c.length, 1); assert.equal(c[0].status, 'requested');
  assert.equal(readLines(root, 'data/state/drafts.jsonl').length, 2);
});

test('claims verifier (gate 3): an unsupported claim is fed back, and blocks the post when it stays', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  const draftFn = stub(GOOD_DRAFT);
  const verifyFn = verifier([{ claim: 'Nusuk permet de réserver sans agence', fact_ids: [] }]);
  const s = await runGenerate({ root, today: TODAY, draftFn, verifyFn, log: quiet });
  assert.equal(s.failed.length, 1);
  assert.equal(draftFn.calls.length, 2);
  assert.match(draftFn.calls[1].messages[2].content, /\[claims\] claim not supported by a fact of the brief: « Nusuk permet/);
  assert.equal(verifyFn.calls[0].type, 'json_schema');
  assert.ok(!fs.existsSync(path.join(root, 'content/alpha.test/fr/posts/derniere-date-utile.md')));
});

test('review mode: written as draft and listed in the weekly queue', async () => {
  const root = tmpNetwork({ cadence: { publish_mode: 'review' }, topics: { 'alpha.test': [alphaTopic()] } });
  const s = await gen({ root, today: TODAY, draftFn: stub(GOOD_DRAFT), log: quiet });
  assert.equal(s.written[0].status, 'draft');
  assert.match(fs.readFileSync(path.join(root, 'content/alpha.test/fr/posts/derniere-date-utile.md'), 'utf8'), /status: draft/);
  const q = readJson(root, 'data/queue/2026-W43.json');
  assert.equal(q.items[0].topic_id, 'al-fr-0001');
});

test('idle cases: no launch date, spend cap reached, quota already used today', async () => {
  let root = tmpNetwork({ cadence: { launch_date: null }, topics: { 'alpha.test': [alphaTopic()] } });
  let s = await gen({ root, today: TODAY, draftFn: stub(GOOD_DRAFT), log: quiet });
  assert.equal(s.written.length, 0);
  assert.match(s.idle.find(x => x.site === 'alpha.test').reason, /launch_date/);

  root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  fs.mkdirSync(path.join(root, 'data/state'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/state/spend.json'), JSON.stringify({ months: { '2026-10': { usd_estimate: 10 } } }));
  s = await gen({ root, today: TODAY, draftFn: stub(GOOD_DRAFT), log: quiet });
  assert.match(s.stopped, /spend cap/);

  // Ramp day 1 = 1 post per day: a run after a post dated today does nothing more.
  root = tmpNetwork({ cadence: { launch_date: TODAY }, topics: { 'alpha.test': [alphaTopic(), alphaTopic({ id: 'al-fr-0002', slug: 'autre', primary_keyword: 'autre test', concept_id: 'test_other', title: 'Un autre sujet de démonstration utile' })] } });
  s = await gen({ root, today: TODAY, draftFn: stub(GOOD_DRAFT), log: quiet });
  assert.equal(s.written.length, 1);
  s = await gen({ root, today: TODAY, draftFn: stub(GOOD_DRAFT), log: quiet });
  assert.equal(s.written.length, 0);
});

test('skips without API credentials (no stub, not a dry run)', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [alphaTopic()] } });
  const s = await gen({ root, today: TODAY, env: {}, log: quiet });
  assert.match(s.stopped, /ANTHROPIC_API_KEY and CLAUDE_MODEL not set/);
});

test('normalizeDraft and briefChecks keep the model inside the brief', () => {
  const fixed = { slug: 'x-y', type: 'checklist', tier: 'C', lang: 'fr', date: TODAY, status: 'published', author: 'org', primary_keyword: 'k', cluster: 'c', concept_id: 'cc', cta: { type: 'whatsapp', topic: 't' } };
  const n = normalizeDraft('```markdown\n---\ntitle: "T"\ndescription: "D"\nsources: [{title: x}]\nfull_read: true\n---\nTexte [[fact:fact_other]] et [lien](https://evil.example/x) et [[wt:home|Wiki Tours]].\n```', fixed);
  assert.equal(n.fm.slug, 'x-y'); assert.equal(n.fm.sources, undefined); assert.equal(n.fm.full_read, undefined);
  const brief = { facts: [{ id: 'fact_ok' }], allowed_outbound_urls: ['https://ok.example/'], sister_links: [], wikitours_link: null };
  const msgs = briefChecks(n, brief).map(p => p.msg).join('\n');
  assert.match(msgs, /fact_other/); assert.match(msgs, /evil\.example/); assert.match(msgs, /wikitours\.ma link not allowed/);
  assert.deepEqual(missingRequests('a [[MISSING: x]] b [[MISSING: x]] [[MISSING:y ]]'), ['x', 'y']);
  assert.equal(normalizeDraft('no front matter', fixed).text, null);
});

test('CLI --dry-run --limit 1 prints one brief, calls no API and writes nothing', () => {
  const root = tmpNetwork({ cadence: { launch_date: null }, topics: { 'alpha.test': [alphaTopic(), alphaTopic({ id: 'al-fr-0002', concept_id: 'z', slug: 'z', primary_keyword: 'zz test', title: 'Encore un autre sujet de démonstration' })] } });
  const before = fs.readFileSync(path.join(root, 'content/alpha.test/topics.json'), 'utf8');
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/generate.js'), '--dry-run', '--limit', '1', '--root', root, '--today', TODAY], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout.match(/===== brief /g) || []).length, 1);
  assert.match(r.stdout, /alpha\.test \/ al-fr-0001/);
  assert.match(r.stdout, /simulating ramp day 1/);
  assert.match(r.stdout, /"front_matter_fixed"/);
  assert.equal(fs.readFileSync(path.join(root, 'content/alpha.test/topics.json'), 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(root, 'data/state/spend.json')));
  assert.ok(!fs.existsSync(path.join(root, 'content/alpha.test/fr/posts/derniere-date-utile.md')));
});
