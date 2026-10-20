// Loads Markdown files from content/<domain>/<lang>/{pages,posts}/ and assigns URLs.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { normalizeDates, exists } from './util.js';

export const RESERVED_SLUGS = new Set(['blog', 'sujets', 'ar', 'go', 'assets', 'page']);
export const ARTICLE_TYPES = new Set(['pillar', 'guide', 'explainer', 'checklist', 'local', 'data', 'news']);

export function langPrefix(project, lang) {
  return lang === (project.network.base_lang || 'fr') ? '' : `/${lang}`;
}

export function pageUrl(project, { kind, lang, fm }) {
  const prefix = langPrefix(project, lang);
  if (kind === 'pages' && fm.type === 'home') return `${prefix}/`;
  if (kind === 'posts') return `${prefix}/blog/${fm.slug}/`;
  return `${prefix}/${fm.slug}/`;
}

export function loadContent(project) {
  const all = [];
  for (const site of project.sites.values()) {
    for (const lang of site.meta.languages) {
      for (const kind of ['pages', 'posts']) {
        const dir = path.join(project.root, 'content', site.domain, lang, kind);
        if (!exists(dir)) continue;
        for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
          const file = path.join(dir, name);
          const parsed = matter(fs.readFileSync(file, 'utf8'), {}); // options object disables gray-matter's cache
          const fm = normalizeDates(parsed.data);
          all.push({
            site: site.domain, lang, kind, fm, body: parsed.content,
            file: path.relative(project.root, file), fileSlug: name.replace(/\.md$/, ''),
          });
        }
      }
    }
  }
  return all;
}

// Pages that are rendered in this build. Returns { pages, excluded: [{file, reason}] }.
export function selectPublishable(project, all) {
  const pages = [], excluded = [];
  for (const p of all) {
    if (p.fm.status !== 'published') { excluded.push({ file: p.file, reason: `status ${p.fm.status ?? 'missing'}` }); continue; }
    if (p.fm.requires_legal && !project.legal.legal_ok) { excluded.push({ file: p.file, reason: 'requires_legal without legal_ok (gate 19)' }); continue; }
    p.url = pageUrl(project, p);
    p.absUrl = `https://${p.site}${p.url}`;
    pages.push(p);
  }
  return { pages, excluded };
}

// Index: "<site>|<lang>|<slug>" -> page.
export function buildIndex(pages) {
  const index = new Map();
  for (const p of pages) index.set(`${p.site}|${p.lang}|${p.fm.slug}`, p);
  return index;
}
