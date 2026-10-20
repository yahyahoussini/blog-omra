// Loads every config file, the facts registry and the themes of a project root.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJSON, exists } from './util.js';
import { defaultLabels } from '../templates/labels.js';
import { LANG_CODES } from './i18n.js';

const optional = (file, fallback) => (exists(file) ? readJSON(file) : fallback);

export async function loadProject(root) {
  const cfg = f => path.join(root, 'config', f);
  const network = readJSON(cfg('network.json'));
  const project = {
    root,
    network,
    linkPolicy: readJSON(cfg('link-policy.json')),
    targets: optional(cfg('wikitours-targets.json'), { targets: [], reserved_concepts: [], reserved_keyword_patterns: [] }),
    publisher: readJSON(cfg('publisher.json')),
    legal: optional(cfg('legal.json'), { legal_ok: null }),
    authors: optional(cfg('authors.json'), []),
    phrases: optional(cfg('approved-phrases.json'), {}),
    entities: optional(cfg('entities.json'), { allowed: [] }),
    sites: new Map(),
  };
  // Facts: data/facts/registry.json + every data/facts/extra/*.json (same schema). Ids must be unique across files:
  // registryGate reports a duplicate as an error with no site, which blocks the whole build.
  project.registryFiles = loadFactFiles(root);
  project.registryList = project.registryFiles.flatMap(f => f.facts);
  project.registry = Object.fromEntries(project.registryList.map(f => [f.id, f]));
  // Approved religious texts (gate 4): one JSON file per entry in data/facts/kb/.
  const kbDir = path.join(root, 'data/facts/kb');
  project.kbList = exists(kbDir) ? fs.readdirSync(kbDir).filter(f => f.endsWith('.json')).sort().map(f => ({ _file: f, ...readJSON(path.join(kbDir, f)) })) : [];
  project.kb = Object.fromEntries(project.kbList.map(e => [e.id, e]));
  // Network-wide approved phrases (all languages; per-language lists via phrasesFor()).
  project.approvedPhrases = LANG_CODES.flatMap(l => project.phrases[l] || []);
  project.wtTargets = Object.fromEntries(project.targets.targets.map(t => [t.id, t]));

  for (const meta of network.sites) {
    const siteFile = cfg(`sites/${meta.domain}.json`);
    const config = optional(siteFile, {});
    const theme = await loadTheme(root, meta.theme || meta.domain);
    const site = { domain: meta.domain, meta, config, theme, labels: mergeLabels(theme, config) };
    site.approvedPhrases = Object.fromEntries(LANG_CODES.map(l => [l, mergePhrases(project.phrases, config.approved_phrases, l)]));
    project.sites.set(meta.domain, site);
  }
  return project;
}

async function loadTheme(root, id) {
  const dir = path.join(root, 'themes', id);
  const js = path.join(dir, 'theme.js');
  const theme = exists(js) ? (await import(pathToFileURL(js).href)).default : {};
  const cssFile = path.join(dir, 'style.css');
  return { id, ...theme, css: exists(cssFile) ? fs.readFileSync(cssFile, 'utf8') : '', assets: listAssets(path.join(dir, 'assets')) };
}

// themes/<id>/assets/** -> [{ rel: 'assets/x.js', file: absolute path }], copied as-is to dist/<domain>/assets/.
function listAssets(dir, base = dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) return listAssets(file, base);
    return [{ rel: 'assets/' + path.relative(base, file).split(path.sep).join('/'), file }];
  });
}

// engine defaults < theme labels < site config labels, per language.
function mergeLabels(theme, config) {
  const out = {};
  for (const lang of Object.keys(defaultLabels)) {
    out[lang] = { ...defaultLabels[lang], ...(theme.labels?.[lang] || {}), ...(config.labels?.[lang] || {}) };
  }
  return out;
}

function loadFactFiles(root) {
  const files = [{ file: 'data/facts/registry.json', facts: optional(path.join(root, 'data/facts/registry.json'), []) }];
  const extraDir = path.join(root, 'data/facts/extra');
  if (exists(extraDir)) for (const name of fs.readdirSync(extraDir).filter(f => f.endsWith('.json')).sort())
    files.push({ file: `data/facts/extra/${name}`, facts: readJSON(path.join(extraDir, name)) });
  for (const f of files) if (!Array.isArray(f.facts)) throw new Error(`${f.file} must be a JSON array of facts`);
  return files;
}

// Approved phrases for one language: config/approved-phrases.json -> <lang> plus the site's optional
// approved_phrases ({ fr: [], ar: [], en: [] }, or a flat list that applies to every language).
export function mergePhrases(network, site, lang) {
  const own = Array.isArray(site) ? site : (site?.[lang] || []);
  return [...new Set([...(network?.[lang] || []), ...own])];
}

// Phrases the facts gate removes on a page of `site` in `lang`.
export const phrasesFor = (project, site, lang) => project.sites.get(site)?.approvedPhrases?.[lang] || project.phrases[lang] || [];
