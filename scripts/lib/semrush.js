// Semrush CSV ingest -> data/keywords/registry.json (ported from the tested prototype, now on csv-parse).
// Header aliases are mapped, "n/a" stays null, nothing is ever imputed. Reference reports never enter the registry.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { normalizeKeyword, matchKey, detectLang } from '../../engine/lib/normalize.js';
import { sha256 } from '../../engine/lib/util.js';
import { writeJSON, readJSON } from './common.js';

const ALIASES = {
  keyword: ['Keyword'],
  intent: ['Intent', 'Intents', 'Keyword Intents'],
  volume: ['Volume', 'Search Volume'],
  kd: ['Keyword Difficulty', 'Keyword Difficulty Index', 'KD', 'KD %'],
  cpc: ['CPC (USD)', 'CPC', 'CPC (EUR)'],
  competition: ['Competitive Density', 'Competition'],
  serpFeatures: ['SERP Features', 'SERP Features by Keyword'],
  trend: ['Trend', 'Trends'],
  results: ['Number of Results'],
  position: ['Position'],
  prevPosition: ['Previous position', 'Previous Position'],
  url: ['URL', 'Landing Page'],
  traffic: ['Traffic'],
  rank: ['Rank'], site: ['Site'], language: ['Language'], notes: ['Notes'], // R0 manual file
};
export const REFERENCE_REPORTS = ['or-pages', 'or-competitors', 'serp-manual'];
// File name contract (docs/strategy/SEMRUSH-BRIEF.md): <report>_<site|domain>_<slug>_<db>_<YYYYMMDD>.csv
export const NAME_RE = /^(kmt|kmt-questions|or-positions|or-pages|or-competitors|serp-manual|kgap-[a-z]+|pt|main-keywords)_([a-z0-9.-]+)_([a-z0-9-]+)_([a-z]{2})_(\d{8})\.csv$/;
const SOURCE_REPORTS = new Set(['kmt', 'kmt-questions', 'or-positions', 'kgap-missing', 'kgap-untapped', 'kgap-all', 'pt', 'main-keywords']);
const INTENTS = new Set(['informational', 'navigational', 'commercial', 'transactional']);

export const num = v => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || /^n\/?a$/i.test(s) || s === '-') return null;
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function parseCsv(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = parse(text, { delimiter, relax_column_count: true, skip_empty_lines: true, relax_quotes: true });
  const [header = [], ...data] = rows;
  const h = header.map(x => String(x).trim());
  return { delimiter, header: h, records: data.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? '']))) };
}

export function resolveColumns(header) {
  const map = {}, unknown = [];
  for (const h of header) {
    const key = Object.keys(ALIASES).find(k => ALIASES[k].some(a => a.toLowerCase() === h.toLowerCase()));
    if (key) map[key] = h; else unknown.push(h);
  }
  return { map, unknown };
}

export function ingestFile(filePath) {
  const base = path.basename(filePath);
  const m = base.match(NAME_RE);
  if (!m) throw new Error(`bad file name "${base}" (expected <report>_<site>_<slug>_<db>_<YYYYMMDD>.csv)`);
  const [, report, site, slug, db, ymd] = m;
  const exported_at = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}`;
  const source = { report, site, slug, database: db, exported_at, file: base };
  const { header, records } = parseCsv(fs.readFileSync(filePath, 'utf8'));
  if (REFERENCE_REPORTS.includes(report)) return { file: base, kind: 'reference', source, header, records };
  const { map, unknown } = resolveColumns(header);
  if (!map.keyword) throw new Error(`${base}: no Keyword column. Headers: ${header.join(' | ')}`);
  const col = (r, k) => (map[k] ? r[map[k]] : undefined);
  const rows = records.map(r => {
    const kw = String(col(r, 'keyword') || '').trim();
    const langCol = String(col(r, 'language') || '').trim().toLowerCase();
    return {
      keyword: kw, normalized: normalizeKeyword(kw), match_key: matchKey(kw),
      lang: ['fr', 'ar', 'en'].includes(langCol) ? langCol : detectLang(kw),
      intent: String(col(r, 'intent') || '').split(/[,;]/).map(s => s.trim().toLowerCase()).filter(s => INTENTS.has(s)),
      volume: num(col(r, 'volume')), kd: num(col(r, 'kd')), cpc_usd: num(col(r, 'cpc')), competition: num(col(r, 'competition')),
      serp_features: String(col(r, 'serpFeatures') || '').split(',').map(s => s.trim()).filter(Boolean),
      trend: String(col(r, 'trend') || '').split(',').map(num).filter(x => x !== null),
      position: num(col(r, 'position')), url: col(r, 'url') || null,
      rank: num(col(r, 'rank')), site: String(col(r, 'site') || '').trim() || null,
      source,
    };
  }).filter(r => r.keyword);
  return { file: base, kind: 'keywords', unknownColumns: unknown, rows };
}

// kgap_sets.txt (client note) -> { set1: [domains] }. Lines like "set1: wikitours.ma, a.ma, b.ma".
export function parseKgapSets(text) {
  const sets = {};
  for (const line of String(text).replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^\s*(set\d+)\s*:\s*(.+)$/i);
    if (!m) continue;
    const domains = m[2].split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    if (domains.length < 2 || domains.length > 5) throw new Error(`${m[1]}: Keyword Gap takes 2-5 domains`);
    sets[m[1].toLowerCase()] = domains;
  }
  if (!Object.keys(sets).length) throw new Error('kgap_sets.txt: no "setN: domain, domain" lines found');
  return sets;
}

const inRange = (v, min, max, int = false) => (v == null || v < min || (max != null && v > max) || (int && !Number.isInteger(v)) ? null : v);
const latest = (rows, k) => { for (const r of [...rows].reverse()) if (r[k] != null) return r[k]; return null; };
// Human decisions survive a rebuild.
const KEEP = ['owner_site', 'cluster_id', 'role', 'status', 'target_url', 'season', 'reject_reason', 'decided_by', 'decided_at', 'is_main', 'main_rank'];

/** Builds the registry from ingested keyword files. `previous` = the current registry (decisions are kept). */
export function buildRegistry({ ingested, previous = null, sites, reservedPatterns = [], now = new Date().toISOString() }) {
  const reserved = reservedPatterns.map(s => new RegExp(s, 'i'));
  const groups = new Map();
  for (const f of ingested.filter(x => x.kind === 'keywords')) for (const r of f.rows) {
    const id = `kw_${sha256(`${r.lang}|${r.normalized}`).slice(0, 10)}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(r);
  }
  const prev = new Map((previous?.keywords || []).map(k => [k.id, k]));
  const keywords = [];
  for (const [id, rows] of groups) {
    rows.sort((a, b) => a.source.exported_at.localeCompare(b.source.exported_at));
    const first = rows[0];
    const main = rows.find(r => r.source.report === 'main-keywords');
    const isReserved = reserved.some(re => re.test(first.keyword) || re.test(first.normalized));
    const k = {
      id, keyword: first.keyword, normalized: first.normalized, match_key: first.match_key, lang: first.lang,
      volume: inRange(latest(rows, 'volume'), 0, null, true), kd: inRange(latest(rows, 'kd'), 0, 100),
      cpc_usd: inRange(latest(rows, 'cpc_usd'), 0, null), competition: inRange(latest(rows, 'competition'), 0, 1),
      intent: [...new Set(rows.flatMap(r => r.intent))],
      serp_features: [...new Set(rows.flatMap(r => r.serp_features))],
      trend: (latest(rows.map(r => ({ t: r.trend.length ? r.trend : null })), 't') || []).filter(x => x >= 0 && x <= 1).slice(0, 12),
      is_main: false, main_rank: null, cluster_id: null, role: 'unassigned', owner_site: null,
      reserved_for: isReserved ? 'wikitours.ma' : null, target_url: null, season: 'none', status: 'candidate', reject_reason: null,
      sources: rows.filter(r => SOURCE_REPORTS.has(r.source.report)).map(r => ({
        report: r.source.report, database: r.source.database, file: r.source.file, exported_at: r.source.exported_at,
        volume: inRange(r.volume, 0, null, true), kd: inRange(r.kd, 0, 100), position: inRange(r.position, 1, null), url: r.url,
      })),
      decided_by: null, decided_at: null,
    };
    if (main) {
      const owner = sites.includes(main.site) ? main.site : sites.includes(main.source.site) ? main.source.site : null;
      const rank = inRange(main.rank, 1, 10, true);
      if (isReserved) Object.assign(k, { status: 'rejected', reject_reason: 'reserved for wikitours.ma (STRATEGY 6.3 rule 3)' });
      else if (owner && rank) Object.assign(k, { is_main: true, main_rank: rank, owner_site: owner, status: 'assigned', role: 'pillar' });
    }
    const p = prev.get(id);
    if (p) for (const f of KEEP) if (p[f] !== undefined && p.decided_by) k[f] = p[f];
    if (!k.sources.length) continue; // reference-only rows never reach here; unknown report types are dropped
    keywords.push(k);
  }
  keywords.sort((a, b) => a.lang.localeCompare(b.lang) || a.normalized.localeCompare(b.normalized));
  return { version: (previous?.version || 0) + 1, generated_at: now, market: 'MA', keywords, clusters: previous?.clusters || [] };
}

let validator;
export function validateRegistry(reg) {
  if (!validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    validator = ajv.compile(readJSON(new URL('../../engine/schemas/keyword-registry.schema.json', import.meta.url)));
  }
  const ok = validator(reg);
  return { ok, errors: ok ? [] : validator.errors.slice(0, 20).map(e => `${e.instancePath} ${e.message}`) };
}

/**
 * Ingests every CSV in rawDir (if any) and rewrites the registry. Returns a summary; never throws on one bad file.
 */
export function ingestSemrush({ rawDir, registryFile, referenceDir, sites, reservedPatterns }) {
  const out = { files: 0, keywords: 0, reference: 0, errors: [], unknownColumns: {}, written: false };
  if (!fs.existsSync(rawDir)) return out;
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.csv')).sort();
  const kgap = path.join(rawDir, 'kgap_sets.txt');
  if (fs.existsSync(kgap)) {
    try { writeJSON(path.join(path.dirname(registryFile), 'kgap_sets.json'), parseKgapSets(fs.readFileSync(kgap, 'utf8'))); }
    catch (e) { out.errors.push(e.message); }
  }
  if (!files.length) return out;
  const ingested = [];
  for (const f of files) {
    try {
      const r = ingestFile(path.join(rawDir, f));
      ingested.push(r);
      out.files++;
      if (r.kind === 'reference') { out.reference++; writeJSON(path.join(referenceDir, f.replace(/\.csv$/, '.json')), { source: r.source, header: r.header, rows: r.records }); }
      else if (r.unknownColumns.length) out.unknownColumns[f] = r.unknownColumns;
    } catch (e) { out.errors.push(e.message); }
  }
  if (!ingested.some(r => r.kind === 'keywords')) return out;
  const previous = readJSON(registryFile, null);
  const reg = buildRegistry({ ingested, previous, sites, reservedPatterns });
  const v = validateRegistry(reg);
  if (!v.ok) { out.errors.push(`registry does not validate: ${v.errors.join('; ')}`); return out; }
  writeJSON(registryFile, reg);
  Object.assign(out, { keywords: reg.keywords.length, written: true });
  return out;
}
