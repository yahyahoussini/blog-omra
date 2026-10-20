#!/usr/bin/env node
// Run every gate without writing the sites (the report still goes to dist/_reports/gates.json).
// Usage: node scripts/check.js [--today 2026-10-20] [--verbose]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNetwork, printFindings } from '../engine/lib/build.js';

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = path.resolve(opt('--root') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

const res = await buildNetwork({ root, today: opt('--today'), write: false });
printFindings(res.findings, { verbose: args.includes('--verbose') });
console.log(`\n${res.pages.length} pages checked: ${res.errors.length} errors, ${res.warnings.length} warnings.`);
process.exit(res.errors.length ? 1 : 0);
