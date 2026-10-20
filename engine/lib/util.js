// Small shared helpers.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const exists = file => fs.existsSync(file);

const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => HTML_ESC[c]);

// Fact markers may appear in titles and descriptions for the facts gate; they never render there.
export const stripMarkers = s => String(s ?? '').replace(/\s*\[\[fact:[a-z0-9_]+\]\]/g, '').trim();

// Today's date in Morocco (the publishing calendar), as YYYY-MM-DD. Same rule as scripts/lib/common.js casablancaToday.
export const todayISO = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const LOCALES = { fr: 'fr-FR', ar: 'ar-MA', en: 'en-GB' };
const DATE_FORMATS = new Map(); // one Intl formatter per language (creating one per call is slow on big builds)
export function formatDate(ymd, lang = 'fr') {
  if (!ymd) return '';
  if (!DATE_FORMATS.has(lang)) DATE_FORMATS.set(lang, new Intl.DateTimeFormat(LOCALES[lang] || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }));
  return DATE_FORMATS.get(lang).format(new Date(ymd + 'T12:00:00Z'));
}

export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

// FNV-1a 32-bit, used for stable page ids.
export function fnv32(str) {
  let h = 0x811c9dc5;
  for (const byte of Buffer.from(str, 'utf8')) { h ^= byte; h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Replace {name} placeholders in label strings.
export const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// Convert Date objects (YAML dates) to YYYY-MM-DD strings, recursively.
export function normalizeDates(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(normalizeDates);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizeDates(x)]));
  return v;
}
