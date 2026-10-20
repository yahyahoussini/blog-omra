// The seeded facts registry follows the STRATEGY 10.3 schema and the DECISIONS D-E rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateFact } from '../engine/lib/gates.js';

const registry = JSON.parse(fs.readFileSync(new URL('../data/facts/registry.json', import.meta.url)));

test('every entry validates against the registry schema', () => {
  for (const f of registry) assert.ok(validateFact(f), `${f.id}: ${JSON.stringify(validateFact.errors)}`);
  assert.equal(new Set(registry.map(f => f.id)).size, registry.length, 'ids are unique');
  assert.ok(registry.length >= 60 && registry.length <= 120, `${registry.length} facts`);
});

test('approved facts carry desk-research verification; likely/estimate carry required wording', () => {
  for (const f of registry.filter(x => x.status === 'approved')) {
    assert.equal(f.verified_by, 'desk-research-2026-10-20', f.id);
    assert.equal(f.verified_at, '2026-10-20', f.id);
    assert.ok(f.review_by > '2026-10-20', f.id);
  }
  for (const f of registry.filter(x => x.confidence !== 'verified')) assert.ok(f.required_wording, f.id);
});

test('Wiki Tours licence and "since 2016" stay proposed (not usable)', () => {
  for (const id of ['fact_wikitours_licence', 'fact_wikitours_since_2016']) {
    const f = registry.find(x => x.id === id);
    assert.equal(f.status, 'proposed'); assert.equal(f.source_tier, 'company_stated'); assert.equal(f.verified_by, undefined);
  }
});

test('the seed table facts exist with the right values', () => {
  const get = id => registry.find(x => x.id === id);
  assert.deepEqual(get('fact_umrah_1448_last_visa').values, ['1', '1448', '9', '2027']);
  assert.ok(get('fact_hajj_1447_final_cost').values.includes('63021'));
  assert.equal(get('fact_ramadan_1448_start_umq').confidence, 'estimate');
  assert.equal(get('fact_umrah_1448_last_entry').source_tier, 'official');
});
