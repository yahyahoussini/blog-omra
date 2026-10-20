#!/usr/bin/env node
// Build every site (strict gates), deploy the sites whose output changed to Cloudflare Pages, ping IndexNow for
// new/changed/removed URLs, and record the deployed state in data/ledger/published.json.
// Usage: node scripts/publish.js [--dry-run] [--site guideomra.ma] [--today YYYY-MM-DD] [--root dir]
// Deploys only when CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are set; otherwise skips with a message.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildNetwork, printFindings } from '../engine/lib/build.js';
import { indexNowKey, submitIndexNow } from '../engine/lib/indexnow.js';
import { sha256 } from '../engine/lib/util.js';
import { parseArgs, rootFrom, casablancaToday, readJSON, writeJSON, hasEnv, paths } from './lib/common.js';

const args = parseArgs();
const root = rootFrom(args);
const today = args.today || casablancaToday();
const dryRun = !!args['dry-run'];
const p = paths(root);
const cadence = readJSON(p.cadence);

if (cadence.paused) { console.log('publish: paused in config/cadence.json, nothing deployed.'); process.exit(0); }

const res = await buildNetwork({ root, today });
printFindings(res.findings);
if (res.errors.length) { console.error(`publish: ${res.errors.length} gate error(s): nothing built, nothing deployed.`); process.exit(1); }

// Fingerprint of a site's output, and of each indexable HTML URL.
const fileToUrl = f => '/' + f.replace(/index\.html$/, '');
function fingerprint(files) {
  const urls = {};
  const all = [];
  for (const [file, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const h = sha256(content).slice(0, 16);
    all.push(`${file}:${h}`);
    if (file.endsWith('.html') && file !== '404.html' && !/<meta name="robots" content="noindex/.test(content)) urls[fileToUrl(file)] = h;
  }
  return { hash: sha256(all.join('\n')).slice(0, 16), urls };
}

const ledger = readJSON(p.ledger, { sites: {} });
const canDeploy = hasEnv('CLOUDFLARE_API_TOKEN') && hasEnv('CLOUDFLARE_ACCOUNT_ID');
if (!canDeploy) console.log('publish: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set: deploy and IndexNow skipped (sites were built in dist/).');
let failures = 0, deployed = 0;

for (const site of res.project.sites.values()) {
  if (args.site && site.domain !== args.site) continue;
  const files = res.outputs.get(site.domain);
  if (!files?.size) continue;
  const fp = fingerprint(files);
  const prev = ledger.sites[site.domain];
  if (prev?.hash === fp.hash) { console.log(`${site.domain}: unchanged`); continue; }
  const changed = Object.keys(fp.urls).filter(u => prev?.urls?.[u] !== fp.urls[u]);
  const removed = Object.keys(prev?.urls || {}).filter(u => !(u in fp.urls));
  console.log(`${site.domain}: changed (${changed.length} new/changed URL(s), ${removed.length} removed)`);
  if (dryRun || !canDeploy) continue;

  const dir = path.join(root, 'dist', site.domain);
  const run = spawnSync('npx', ['--yes', 'wrangler', 'pages', 'deploy', dir, `--project-name=${site.meta.cf_project}`, '--branch=main'], { stdio: 'inherit', env: process.env, cwd: root });
  if (run.status !== 0) { failures++; console.error(`${site.domain}: deploy failed (exit ${run.status}); the previous version stays live.`); continue; }
  deployed++;

  // IndexNow (Bing, Yandex, Seznam, Naver, Yep). Google does not use it.
  const urls = [...changed, ...removed].map(u => `https://${site.domain}${u}`);
  let indexnow = { status: 'skipped' };
  try { indexnow = await submitIndexNow(site.domain, indexNowKey(site.domain, site.config), urls); }
  catch (e) { indexnow = { status: 'error', message: e.message }; }
  console.log(`${site.domain}: IndexNow ${indexnow.status} (${urls.length} URL(s))`);

  ledger.sites[site.domain] = {
    project: site.meta.cf_project, deployed_at: new Date().toISOString(), deployed_on: today, hash: fp.hash, urls: fp.urls,
    last_changes: { changed: changed.length, removed: removed.length }, indexnow: { status: indexnow.status, count: urls.length },
  };
  writeJSON(p.ledger, ledger);
}
console.log(`\npublish: ${deployed} site(s) deployed, ${failures} failed${dryRun ? ' (dry run)' : ''}.`);
process.exit(failures ? 1 : 0);
