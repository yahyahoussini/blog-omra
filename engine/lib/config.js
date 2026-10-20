// Loads every config file, the facts registry and the themes of a project root.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJSON, exists } from './util.js';
import { defaultLabels } from '../templates/labels.js';

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
    registryList: optional(path.join(root, 'data/facts/registry.json'), []),
    sites: new Map(),
  };
  project.registry = Object.fromEntries(project.registryList.map(f => [f.id, f]));
  project.approvedPhrases = [...(project.phrases.fr || []), ...(project.phrases.ar || [])];
  project.wtTargets = Object.fromEntries(project.targets.targets.map(t => [t.id, t]));

  for (const meta of network.sites) {
    const siteFile = cfg(`sites/${meta.domain}.json`);
    const config = optional(siteFile, {});
    const theme = await loadTheme(root, meta.theme || meta.domain);
    project.sites.set(meta.domain, { domain: meta.domain, meta, config, theme, labels: mergeLabels(theme, config) });
  }
  return project;
}

async function loadTheme(root, id) {
  const dir = path.join(root, 'themes', id);
  const js = path.join(dir, 'theme.js');
  const theme = exists(js) ? (await import(pathToFileURL(js).href)).default : {};
  const cssFile = path.join(dir, 'style.css');
  return { id, ...theme, css: exists(cssFile) ? fs.readFileSync(cssFile, 'utf8') : '' };
}

// engine defaults < theme labels < site config labels, per language.
function mergeLabels(theme, config) {
  const out = {};
  for (const lang of Object.keys(defaultLabels)) {
    out[lang] = { ...defaultLabels[lang], ...(theme.labels?.[lang] || {}), ...(config.labels?.[lang] || {}) };
  }
  return out;
}
