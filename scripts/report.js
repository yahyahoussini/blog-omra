#!/usr/bin/env node
// Weekly one-page report -> reports/<YYYY>-W<ww>.md, and a GitHub issue « Revue hebdo <YYYY>-W<ww> » labelled
// weekly-review when GITHUB_TOKEN and GITHUB_REPOSITORY are set (closing it = review done, dead-man switch reset).
// Usage: node scripts/report.js [--today YYYY-MM-DD] [--no-issue] [--root dir]
import path from 'node:path';
import fs from 'node:fs';
import { parseArgs, rootFrom, casablancaToday, readJSON, paths } from './lib/common.js';
import { collectReportData, buildReport, issueBody } from './lib/report.js';
import { githubFromEnv, ensureLabel, upsertIssue } from './lib/github.js';

const args = parseArgs();
const root = rootFrom(args);
const today = args.today || casablancaToday();
const data = await collectReportData({ root, today });
const report = buildReport(data);
const file = path.join(paths(root).reports, `${data.week.label}.md`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, report + '\n');
console.log(`report written: ${path.relative(process.cwd(), file)}`);

const gh = githubFromEnv();
if (args['no-issue']) console.log('issue: skipped (--no-issue)');
else if (!gh) console.log('issue: skipped (GITHUB_TOKEN / GITHUB_REPOSITORY not set)');
else {
  const label = readJSON(paths(root).killswitch).dead_man?.label || 'weekly-review';
  await ensureLabel(gh, label);
  const issue = await upsertIssue(gh, { title: `Revue hebdo ${data.week.label}`, body: issueBody(report, data), labels: [label] });
  console.log(`issue ${issue.updated ? 'updated' : 'created'}: ${issue.html_url}`);
}
