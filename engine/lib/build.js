// Orchestrates a network build: load -> validate -> render -> gate -> write.
import fs from 'node:fs';
import path from 'node:path';
import { loadProject } from './config.js';
import { loadContent, selectPublishable, buildIndex, langPrefix } from './content.js';
import { assignPageIds } from './wa.js';
import { renderContentPage, renderGeneratedPages } from './render.js';
import { registryGate, frontmatterGate, runGates } from './gates.js';
import { sitemapXml, sitemapIndexXml, rssXml, robotsTxt, headersFile, redirectsFile, faviconSvg } from './seo.js';
import { indexNowKey } from './indexnow.js';
import { todayISO, writeFile, stripMarkers } from './util.js';

const fileOf = url => (url.endsWith('/') ? url.slice(1) + 'index.html' : url.slice(1));

/**
 * @param {object} o
 * @param {string} o.root     project root (config/, content/, themes/, data/)
 * @param {string} [o.outDir] default <root>/dist
 * @param {string} [o.today]  YYYY-MM-DD (tests pin it)
 * @param {string[]} [o.only] domains to write (all sites are always rendered and gated together)
 * @param {boolean} [o.write] write dist files (false = check only)
 * @param {boolean} [o.strict] refuse to write sites when any gate error exists
 */
export async function buildNetwork({ root, outDir, today = todayISO(), only = null, write = true, strict = true } = {}) {
  outDir ??= path.join(root, 'dist');
  const project = await loadProject(root);
  const findings = [];
  const add = (level, gate, where, msg) => findings.push({ level, gate, site: where?.site ?? null, file: where?.file ?? null, url: where?.url ?? null, msg });

  registryGate(project, add);
  const all = loadContent(project);
  frontmatterGate(project, all, add, today);
  const valid = all.filter(p => !p.invalid);
  const { pages: published, excluded } = selectPublishable(project, valid);
  // Published posts dated in the future are scheduled: they build on their date.
  const pages = published.filter(p => {
    if (p.fm.date > today) { excluded.push({ file: p.file, reason: `scheduled for ${p.fm.date}` }); return false; }
    return true;
  });
  for (const site of project.sites.keys()) {
    try { assignPageIds(pages.filter(p => p.site === site)); } catch (e) { add('error', 'frontmatter', { site }, e.message); }
  }
  const ctx = { project, pages, index: buildIndex(pages), today, navErrors: [] };

  for (const p of pages) renderContentPage(ctx, p);
  const generated = [];
  for (const site of project.sites.values()) for (const lang of site.meta.languages) {
    if (!pages.some(p => p.site === site.domain && p.lang === lang)) continue;
    for (const g of renderGeneratedPages(ctx, site, lang)) generated.push({ ...g, site: site.domain, lang });
  }

  // Assemble every output file per site.
  const outputs = new Map();
  for (const site of project.sites.values()) {
    const files = new Map();
    const sitePages = pages.filter(p => p.site === site.domain);
    if (!sitePages.length) { outputs.set(site.domain, files); continue; }
    for (const p of sitePages) files.set(fileOf(p.url), p.html);
    const siteGen = generated.filter(g => g.site === site.domain);
    for (const g of siteGen) files.set(g.file || fileOf(g.url), g.html);

    const abs = u => `https://${site.domain}${u}`;
    const lastPost = lang => sitePages.filter(p => p.kind === 'posts' && p.lang === lang).map(p => p.fm.updated || p.fm.date).sort().pop();
    const pageEntries = [], postEntries = [];
    for (const p of sitePages) {
      if (p.noindexFinal) continue;
      let lastmod = p.fm.updated || p.fm.date;
      if (p.fm.type === 'home') lastmod = [lastmod, lastPost(p.lang)].filter(Boolean).sort().pop();
      (p.kind === 'posts' ? postEntries : pageEntries).push({ loc: p.absUrl, lastmod });
    }
    for (const g of siteGen.filter(g => g.sitemap)) pageEntries.push({ loc: abs(g.url), lastmod: g.lastmod });
    const parts = [{ name: 'sitemap-pages.xml', entries: pageEntries }, { name: 'sitemap-posts.xml', entries: postEntries }].filter(x => x.entries.length);
    for (const part of parts) files.set(part.name, sitemapXml(part.entries));
    files.set('sitemap-index.xml', sitemapIndexXml(parts.map(x => ({ loc: abs('/' + x.name), lastmod: x.entries.map(e => e.lastmod).sort().pop() }))));

    for (const lang of site.meta.languages) {
      const posts = sitePages.filter(p => p.kind === 'posts' && p.lang === lang && !p.noindexFinal).sort((a, b) => b.fm.date.localeCompare(a.fm.date));
      if (!posts.length) continue;
      const prefix = langPrefix(project, lang);
      const home = sitePages.find(p => p.fm.type === 'home' && p.lang === lang);
      files.set(`${prefix.slice(1)}${prefix ? '/' : ''}rss.xml`, rssXml({
        domain: site.domain, title: site.meta.name, lang, feedPath: `${prefix}/rss.xml`, posts,
        description: stripMarkers(home?.fm.description || site.config.tagline || site.meta.role),
      }));
    }
    files.set('robots.txt', robotsTxt(project, site.domain));
    const key = indexNowKey(site.domain, site.config);
    files.set(`${key}.txt`, key);
    files.set('_headers', headersFile(site));
    files.set('_redirects', redirectsFile(site));
    files.set('favicon.svg', faviconSvg(site.theme));
    outputs.set(site.domain, files);
  }

  for (const e of ctx.navErrors) add('error', 'links', { site: e.site }, e.msg);
  runGates({ project, pages, generated, outputs, today, add });
  for (const x of excluded) add('info', 'excluded', { file: x.file }, x.reason);

  const errors = findings.filter(f => f.level === 'error');
  const warnings = findings.filter(f => f.level === 'warning');
  const report = { generated_at: new Date().toISOString(), today, errors: errors.length, warnings: warnings.length, pages: pages.length, findings };
  writeFile(path.join(outDir, '_reports', 'gates.json'), JSON.stringify(report, null, 2) + '\n');

  const written = [];
  if (write && (!strict || !errors.length)) {
    for (const [domain, files] of outputs) {
      if (only && !only.includes(domain)) continue;
      if (!files.size) continue;
      const dir = path.join(outDir, domain);
      fs.rmSync(dir, { recursive: true, force: true });
      for (const [file, content] of files) writeFile(path.join(dir, file), content);
      written.push({ domain, files: files.size });
    }
  }
  return { project, pages, generated, outputs, findings, errors, warnings, excluded, written, report };
}

// Console summary used by scripts/build.js and scripts/check.js.
export function printFindings(findings, { verbose = false } = {}) {
  const fmt = f => `  [${f.gate}] ${[f.site, f.file || f.url].filter(Boolean).join(' ')}: ${f.msg}`;
  const errors = findings.filter(f => f.level === 'error'), warnings = findings.filter(f => f.level === 'warning');
  if (errors.length) console.error(`\n${errors.length} error(s):\n` + errors.map(fmt).join('\n'));
  if (warnings.length) console.warn(`\n${warnings.length} warning(s):\n` + (verbose ? warnings : warnings.slice(0, 40)).map(fmt).join('\n') + (!verbose && warnings.length > 40 ? `\n  … ${warnings.length - 40} more in dist/_reports/gates.json` : ''));
}
