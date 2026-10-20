// Self-hosted fonts (docs/DESIGN.md §6): WOFF2 files from the @fontsource devDependencies, copied at build into each
// site's /assets/fonts/. Only the weights and subsets the design uses. No third-party font origin (CSP font-src 'self').
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LATIN = ['latin', 'latin-ext'];
// [package, file prefix, weights, subsets, arabic?]
const SETS = [
  ['dm-serif-display', 'dm-serif-display', [400], LATIN, false],
  ['dm-sans', 'dm-sans', [400, 600, 700], LATIN, false],
  ['dm-mono', 'dm-mono', [400], LATIN, false],
  ['ibm-plex-sans-arabic', 'ibm-plex-sans-arabic', [400, 600], ['arabic'], true],
  ['noto-kufi-arabic', 'noto-kufi-arabic', [700], ['arabic'], true],
];
export const FONT_FILES = SETS.flatMap(([pkg, prefix, weights, subsets, arabic]) =>
  weights.flatMap(w => subsets.map(s => ({ pkg, name: `${prefix}-${s}-${w}-normal.woff2`, arabic }))));

// The one face each language preloads: the body face of the page's language.
export const PRELOAD = { fr: 'dm-sans-latin-400-normal.woff2', en: 'dm-sans-latin-400-normal.woff2', ar: 'ibm-plex-sans-arabic-arabic-400-normal.woff2' };

function pkgDir(pkg) {
  try { return path.dirname(require.resolve(`@fontsource/${pkg}/package.json`)); } catch { return null; }
}

let cached = null;
// { files: [{ name, file, arabic }], missing: [name] } (cached: the packages do not change during a run).
export function fontFiles() {
  if (cached) return cached;
  const files = [], missing = [];
  for (const f of FONT_FILES) {
    const dir = pkgDir(f.pkg);
    const file = dir && path.join(dir, 'files', f.name);
    if (file && fs.existsSync(file)) files.push({ name: f.name, file, arabic: f.arabic }); else missing.push(f.name);
  }
  return (cached = { files, missing });
}

// Assets to copy for one site: Latin faces always, Arabic faces only when the site has Arabic pages.
export const fontAssets = ({ arabic }) => fontFiles().files.filter(f => arabic || !f.arabic).map(f => ({ rel: `assets/fonts/${f.name}`, file: f.file }));
export const hasFont = name => fontFiles().files.some(f => f.name === name);
