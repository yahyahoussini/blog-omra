// Weekly planner with a stubbed model (no network) and the Semrush CSV ingest.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runPlan } from '../scripts/lib/planner.js';
import { ingestFile, ingestSemrush, num } from '../scripts/lib/semrush.js';
import { tmpNetwork, cleanup, readJson, readLines, TODAY } from './lib/tmp-network.js';

after(cleanup);
const quiet = () => {};
const proposal = extra => ({
  title: 'Calendrier de démonstration : relire chaque échéance', slug: 'relire-echeances', primary_keyword: 'relire echeance test',
  cluster: 'test_dates', concept_id: 'test_deadlines', type: 'checklist', angle: 'méthode', outline: ['a', 'b'],
  facts_needed: ['fact_test_last_visa'], missing_facts: [], internal_links: ['guide-test'], sister_links: [], wt_target: '', cta_topic: 'Question', notes: '', ...extra,
});

test('plan: short queues get proposals (structured output); accepted topics are appended, missing facts requested', async () => {
  const root = tmpNetwork({ topics: { 'alpha.test': [], 'beta.test': [] } });
  const calls = [];
  const proposeFn = async args => {
    calls.push(args);
    const topics = args.messages[0].content.includes('"site":"alpha.test"')
      ? [proposal(), proposal({ title: 'Une étape qui attend encore un fait officiel', primary_keyword: 'etape fait officiel test', concept_id: 'test_waiting', slug: 'etape-fait-officiel', facts_needed: [], missing_facts: ['date officielle de la prochaine étape'] })]
      : [];
    return { text: JSON.stringify({ topics }), usage: { input_tokens: 2000, output_tokens: 1000 }, stopReason: 'end_turn' };
  };
  const s = await runPlan({ root, today: TODAY, proposeFn, log: quiet });
  assert.equal(calls.length, 2, 'one request per site and active language');
  assert.equal(calls[0].format.type, 'json_schema');
  assert.match(calls[0].system, /Return the JSON object only/);
  const req = JSON.parse(calls[0].messages[0].content.split('<request>\n')[1].split('\n</request>')[0]);
  assert.equal(req.count, 15);
  assert.ok(req.reserved_wikitours_concepts.some(c => c.concept_id === 'gammes_omra'));
  assert.ok(req.approved_facts.every(f => f.id !== 'fact_test_old' && f.id !== 'fact_wikitours_licence'));
  assert.deepEqual(s.added.map(a => a.status), ['queued', 'blocked']);
  const topics = readJson(root, 'content/alpha.test/topics.json');
  assert.deepEqual(topics.map(t => [t.id, t.status, t.lang]), [['al-fr-0001', 'queued', 'fr'], ['al-fr-0002', 'blocked', 'fr']]);
  assert.equal(readLines(root, 'data/facts/candidates.jsonl')[0].request, 'date officielle de la prochaine étape');
  assert.equal(readJson(root, 'data/state/spend.json').months['2026-10'].by_purpose.plan, 2 * (2000 * 5 + 1000 * 25) / 1e6);

  // Second run: the same proposal is now a duplicate of a queued topic and is rejected.
  const again = await runPlan({ root, today: TODAY, proposeFn, log: quiet });
  assert.equal(again.added.length, 0);
  assert.ok(again.rejected.some(r => r.reasons.some(x => /same primary keyword as topic al-fr-0001/.test(x))));
});

test('plan: skips proposals without API credentials, and a full queue asks for nothing', async () => {
  const root = tmpNetwork();
  const s = await runPlan({ root, today: TODAY, env: {}, log: quiet });
  assert.match(s.stopped, /ANTHROPIC_API_KEY and CLAUDE_MODEL not set/);
  const full = Array.from({ length: 31 }, (_, i) => ({ id: `al-fr-${i}`, lang: 'fr', title: `t${i}`, primary_keyword: `k${i}`, cluster: 'test_dates', concept_id: `c${i}`, type: 'checklist', facts_needed: ['fact_test_last_visa'], status: 'queued' }));
  const root2 = tmpNetwork({ topics: { 'alpha.test': full }, cadence: { launch_date: null } });
  const s2 = await runPlan({ root: root2, today: TODAY, site: 'alpha.test', env: {}, log: quiet });
  assert.equal(s2.requested.length, 0);
});

test('semrush ingest: aliases mapped, missing volumes stay null (never imputed), reserved keywords flagged', () => {
  const root = tmpNetwork();
  const raw = path.join(root, 'data/semrush/raw');
  fs.mkdirSync(raw, { recursive: true });
  fs.writeFileSync(path.join(raw, 'kmt_alpha.test_omra_ma_20261015.csv'), '﻿Keyword;Intent;Volume;Keyword Difficulty;CPC (USD);Trend\nomra ramadan dates;Informational;1300;35;0,4;"0.5,1"\nprix omra ramadan;Commercial, Transactional;n/a;;;\ngammes omra vip;Commercial;90;20;1.1;\n');
  fs.writeFileSync(path.join(raw, 'bad name.csv'), 'Keyword\nx\n');
  const one = ingestFile(path.join(raw, 'kmt_alpha.test_omra_ma_20261015.csv'));
  assert.equal(one.rows[1].volume, null);
  assert.deepEqual(one.rows[1].intent, ['commercial', 'transactional']);
  assert.equal(one.rows[0].cpc_usd, 0.4);
  assert.equal(num('n/a'), null); assert.equal(num(''), null); assert.equal(num('1 300'), 1300);
  const out = ingestSemrush({ rawDir: raw, registryFile: path.join(root, 'data/keywords/registry.json'), referenceDir: path.join(root, 'data/keywords/reference'), sites: ['alpha.test', 'beta.test'], reservedPatterns: ['gammes? omra'] });
  assert.equal(out.files, 1); assert.equal(out.written, true); assert.equal(out.errors.length, 1);
  const reg = readJson(root, 'data/keywords/registry.json');
  assert.equal(reg.keywords.length, 3);
  const byKw = Object.fromEntries(reg.keywords.map(k => [k.keyword, k]));
  assert.equal(byKw['prix omra ramadan'].volume, null);
  assert.equal(byKw['omra ramadan dates'].volume, 1300);
  assert.equal(byKw['gammes omra vip'].reserved_for, 'wikitours.ma');
  assert.equal(byKw['omra ramadan dates'].sources[0].exported_at, '2026-10-15');
});
