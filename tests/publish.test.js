// publish.js without Cloudflare credentials: builds, reports the changed sites, deploys nothing, keeps the ledger.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpNetwork, cleanup, REPO, TODAY } from './lib/tmp-network.js';

after(cleanup);
const publish = (root, extra = [], env = {}) => spawnSync(process.execPath, [path.join(REPO, 'scripts/publish.js'), '--root', root, '--today', TODAY, ...extra], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });

test('no Cloudflare secrets: sites are built, deploy and IndexNow are skipped cleanly (exit 0)', () => {
  const root = tmpNetwork();
  const r = publish(root, [], { CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CLOUDFLARE_API_TOKEN \/ CLOUDFLARE_ACCOUNT_ID not set: deploy and IndexNow skipped/);
  assert.match(r.stdout, /alpha\.test: changed \(\d+ new\/changed URL\(s\), 0 removed\)/);
  assert.ok(fs.existsSync(path.join(root, 'dist/alpha.test/index.html')));
  assert.ok(!fs.existsSync(path.join(root, 'data/ledger/published.json')), 'nothing deployed, nothing recorded');
});

test('the global pause in config/cadence.json stops publishing', () => {
  const root = tmpNetwork({ cadence: { paused: true } });
  const r = publish(root);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /paused in config\/cadence\.json/);
});
