// Shared helpers for the automation scripts: paths, dates (Africa/Casablanca), JSON/JSONL state files, CLI args.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayISO } from '../../engine/lib/util.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Minimal CLI parser: --flag, --key value. Repeated keys keep the last value.
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

export const rootFrom = args => path.resolve(args.root || REPO_ROOT);

// Today's date in Morocco (the publishing calendar), as YYYY-MM-DD.
export const casablancaToday = todayISO;

export const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 864e5);
export const monthOf = ymd => ymd.slice(0, 7);

// ISO week: { year, week, label: '2026-W43', monday, sunday }.
export function isoWeek(ymd) {
  const d = new Date(ymd + 'T12:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(ymd, -day);
  const thursday = new Date(addDays(monday, 3) + 'T12:00:00Z');
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const week1Monday = addDays(jan4.toISOString().slice(0, 10), -((jan4.getUTCDay() + 6) % 7));
  const week = 1 + Math.round(daysBetween(week1Monday, monday) / 7);
  return { year, week, label: `${year}-W${String(week).padStart(2, '0')}`, monday, sunday: addDays(monday, 6) };
}

export const readJSON = (file, fallback) => {
  if (!fs.existsSync(file)) { if (fallback !== undefined) return fallback; throw new Error(`missing file ${file}`); }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

export function appendJSONL(file, rows) {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
}

// Env var present and non-empty (GitHub passes missing secrets as empty strings).
export const hasEnv = (name, env = process.env) => typeof env[name] === 'string' && env[name].trim() !== '';

// Paths of the automation state, relative to a project root.
export const paths = root => ({
  cadence: path.join(root, 'config/cadence.json'),
  killswitch: path.join(root, 'config/killswitch.json'),
  charters: path.join(root, 'config/charters.json'),
  health: path.join(root, 'data/state/health.json'),
  spend: path.join(root, 'data/state/spend.json'),
  failures: path.join(root, 'data/state/failures.jsonl'),
  drafts: path.join(root, 'data/state/drafts.jsonl'),
  candidates: path.join(root, 'data/facts/candidates.jsonl'),
  queueDir: path.join(root, 'data/queue'),
  ledger: path.join(root, 'data/ledger/published.json'),
  gscDir: path.join(root, 'data/gsc'),
  keywords: path.join(root, 'data/keywords/registry.json'),
  semrushRaw: path.join(root, 'data/semrush/raw'),
  reports: path.join(root, 'reports'),
  topics: domain => path.join(root, 'content', domain, 'topics.json'),
});
