#!/usr/bin/env node
// Weekly: ingest Semrush CSVs into the keyword registry, then top up each site's topic queue to ~30 days.
// Usage: node scripts/plan-topics.js [--dry-run] [--site guideomra.ma] [--today YYYY-MM-DD] [--root dir]
// Topic proposals are skipped (exit 0) when ANTHROPIC_API_KEY or CLAUDE_MODEL is missing.
import { parseArgs, rootFrom, casablancaToday } from './lib/common.js';
import { runPlan } from './lib/planner.js';
import { FatalApiError } from './lib/claude.js';

const args = parseArgs();
try {
  const s = await runPlan({ root: rootFrom(args), today: args.today || casablancaToday(), site: args.site || null, dryRun: !!args['dry-run'] });
  console.log(`\nplan-topics: ${s.added.length} topic(s) added, ${s.rejected.length} rejected, ${s.unblocked} unblocked${s.stopped ? ` — ${s.stopped}` : ''}.`);
} catch (e) {
  console.error(e instanceof FatalApiError ? `plan-topics stopped: ${e.message}` : e.stack || e.message);
  process.exit(1);
}
