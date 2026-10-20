#!/usr/bin/env node
// Build every site into dist/<domain>/ (strict: any gate error blocks writing).
// Usage: node scripts/build.js [--site guideomra.ma] [--today 2026-10-20] [--no-strict] [--verbose]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNetwork, printFindings } from '../engine/lib/build.js';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = path.resolve(opt('--root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const sites = args.flatMap((a, i) => (a === '--site' ? [args[i + 1]] : []));

const res = await buildNetwork({
  root, outDir: opt('--out') ? path.resolve(opt('--out')) : undefined, today: opt('--today'),
  only: sites.length ? sites : null, strict: !args.includes('--no-strict'),
});
printFindings(res.findings, { verbose: args.includes('--verbose') });
for (const w of res.written) console.log(`built ${w.domain}: ${w.files} files`);
console.log(`\n${res.pages.length} pages, ${res.errors.length} errors, ${res.warnings.length} warnings. Report: dist/_reports/gates.json`);
if (res.errors.length) { console.error(res.written.length ? 'Gate errors (written anyway: --no-strict).' : 'Build blocked by gate errors.'); process.exit(1); }
