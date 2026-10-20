// Loads Markdown files from content/<domain>/<lang>/{pages,posts}/ and assigns URLs.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { normalizeDates, exists } from './util.js';

// Page slugs that would collide with engine paths. Every configured language code is reserved too (frontmatterGate).
export const RESERVED_SLUGS = new Set(['blog', 'sujets', 'fr', 'ar', 'en', 'go', 'assets', 'page']);
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

// `overlay` (optional): [{ file: 'content/<domain>/<lang>/<pages|posts>/<slug>.md', text }] read as if they
// were on disk (they replace a disk file with the same path). The generator gates drafts this way.
export function loadContent(project, overlay = []) {
  const all = [];
  // Repo-relative paths always use forward slashes (also on Windows) so they compare with overlay paths.
  const posix = f => path.normalize(f).split(path.sep).join('/');
  const extra = new Map(overlay.map(o => [posix(o.file), o.text]));
  for (const site of project.sites.values()) {
    for (const lang of site.meta.languages) {
      for (const kind of ['pages', 'posts']) {
        const dir = path.join(project.root, 'content', site.domain, lang, kind);
        if (!exists(dir)) continue;
        for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
          const file = path.join(dir, name);
          const rel = posix(path.relative(project.root, file));
          all.push(parseFile(site.domain, lang, kind, rel, extra.has(rel) ? extra.get(rel) : fs.readFileSync(file, 'utf8')));
          extra.delete(rel);
        }
      }
    }
  }
  for (const [rel, text] of extra) {
    const m = rel.match(/^content\/([^/]+)\/([a-z]{2})\/(pages|posts)\/([^/]+)\.md$/);
    if (!m || !project.sites.has(m[1])) throw new Error(`overlay file outside content/<domain>/<lang>/<kind>/: ${rel}`);
    all.push(parseFile(m[1], m[2], m[3], rel, text));
  }
  return all;
}

function parseFile(site, lang, kind, rel, text) {
  const parsed = matter(text, {}); // options object disables gray-matter's cache
  return {
    site, lang, kind, fm: normalizeDates(parsed.data), body: parsed.content,
    file: rel, fileSlug: path.posix.basename(rel).replace(/\.md$/, ''),
  };
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

// Pages of one site + language (cached on ctx: the render loop would otherwise be quadratic).
export function group(ctx, site, lang) {
  ctx._groups ??= new Map();
  const k = `${site}|${lang}`;
  if (!ctx._groups.has(k)) ctx._groups.set(k, ctx.pages.filter(p => p.site === site && p.lang === lang));
  return ctx._groups.get(k);
}

// Index: "<site>|<lang>|<slug>" -> page.
export function buildIndex(pages) {
  const index = new Map();
  for (const p of pages) index.set(`${p.site}|${p.lang}|${p.fm.slug}`, p);
  return index;
}
