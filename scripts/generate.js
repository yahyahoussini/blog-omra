#!/usr/bin/env node
// Daily generator (DECISIONS D-C): quota per site -> queued topics -> Claude draft -> all gates -> publish or queue.
// Usage: node scripts/generate.js [--dry-run] [--site guideomra.ma] [--limit 1] [--today YYYY-MM-DD] [--print-system] [--root dir]
// Skips (exit 0) when ANTHROPIC_API_KEY or CLAUDE_MODEL is missing. Exit 1 only on a fatal API or config error.
import { parseArgs, rootFrom, casablancaToday } from './lib/common.js';
import { runGenerate, FatalApiError } from './lib/generator.js';

const args = parseArgs();
const limit = args.limit != null ? Number(args.limit) : Infinity;
if (Number.isNaN(limit) || limit < 0) { console.error('--limit must be a number'); process.exit(2); }
try {
  const s = await runGenerate({
    root: rootFrom(args), today: args.today || casablancaToday(), site: args.site || null, limit,
    dryRun: !!args['dry-run'], printSystem: !!args['print-system'],
  });
  console.log(`\ngenerate: ${s.written.length} written, ${s.failed.length} discarded, ${s.deferred.length} deferred, ${s.briefs.length} brief(s) printed, ${s.idle.length} site(s) idle${s.stopped ? ` — ${s.stopped}` : ''}.`);
} catch (e) {
  console.error(e instanceof FatalApiError ? `generate stopped: ${e.message}` : e.stack || e.message);
  process.exit(1);
}
