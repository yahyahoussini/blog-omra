// Orchestrates a network build: load -> validate -> render -> gate -> write.
import fs from 'node:fs';
import path from 'node:path';
import { loadProject } from './config.js';
import { loadContent, selectPublishable, buildIndex, langPrefix } from './content.js';
import { assignPageIds } from './wa.js';
import { renderContentPage, renderGeneratedPages, prepareStale, forLang } from './render.js';
import { registryGate, frontmatterGate, runGates } from './gates.js';
import { sitemapXml, sitemapIndexXml, rssXml, robotsTxt, headersFile, redirectsFile, faviconSvg } from './seo.js';
import { indexNowKey } from './indexnow.js';
import { fontAssets, fontFiles } from './fonts.js';
import { defaultTheme, TOGGLE_JS } from './theme.js';
import { todayISO, writeFile, stripMarkers } from './util.js';

const fileOf = url => (url.endsWith('/') ? url.slice(1) + 'index.html' : url.slice(1));

/**
 * @param {object} o
 * @param {string} o.root     project root (config/, content/, themes/, data/)
 * @param {string} [o.outDir] default <root>/dist
 * @param {string} [o.today]  YYYY-MM-DD (tests pin it)
 * @param {string[]} [o.only] domains to write (all sites are always rendered and gated together)
 * @param {boolean} [o.write] write dist files (false = check only)
 * @param {boolean} [o.strict] do not write a site that has a gate error (an error with no site blocks every site);
 *                            the other sites are still written, so one site's error never stops the network
 * @param {Array<{file:string,text:string}>} [o.overlay] in-memory content files (generator drafts), see loadContent
 * @param {boolean} [o.focusOverlay] pairwise gates (duplicate, title) compare only the overlay pages with the network:
 *                                   O(n) per draft; pairs between other pages are the caller's baseline
 */
export async function buildNetwork({ root, outDir, today = todayISO(), only = null, write = true, strict = true, overlay = [], focusOverlay = false } = {}) {
  outDir ??= path.join(root, 'dist');
  const project = await loadProject(root);
  const findings = [];
  const add = (level, gate, where, msg) => findings.push({ level, gate, site: where?.site ?? null, file: where?.file ?? null, url: where?.url ?? null, msg });

  registryGate(project, add);
  const all = loadContent(project, overlay);
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
  // Retired pages: links to them become plain text with a warning instead of a blocking error.
  const retired = new Set(valid.filter(p => p.fm.status === 'retired').map(p => `${p.site}|${p.lang}|${p.fm.slug}`));
  const ctx = { project, pages, index: buildIndex(pages), today, navErrors: [], retired };

  for (const p of pages) prepareStale(ctx, p); // noindex decisions first: templates link only to feeds that exist
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
    // Two sources for one output file (e.g. a page slug equal to a language prefix) is an error, never a silent overwrite.
    const put = (file, content, from) => {
      if (files.has(file)) add('error', 'frontmatter', { site: site.domain, file: from?.file, url: '/' + file }, `output file ${file} is produced twice`);
      else files.set(file, content);
    };
    for (const p of sitePages) put(fileOf(p.url), p.html, p);
    const siteGen = generated.filter(g => g.site === site.domain);
    for (const g of siteGen) put(g.file || fileOf(g.url), g.html);
    for (const a of site.theme.assets || []) put(a.rel, fs.readFileSync(a.file));
    // Design system assets: self-hosted fonts (Arabic faces only for sites with Arabic pages), the dark-mode toggle.
    for (const a of fontAssets({ arabic: sitePages.some(p => p.lang === 'ar') })) if (!files.has(a.rel)) files.set(a.rel, fs.readFileSync(a.file));
    if (defaultTheme(site.theme) === 'dark' && !files.has('assets/theme-toggle.js')) files.set('assets/theme-toggle.js', fs.readFileSync(TOGGLE_JS));

    const abs = u => `https://${site.domain}${u}`;
    const lastPost = lang => sitePages.filter(p => p.kind === 'posts' && p.lang === lang).map(p => p.fm.updated || p.fm.date).sort().pop();
    const pageEntries = [], postEntries = [];
    for (const p of sitePages) {
      if (p.noindexFinal) continue;
      let lastmod = p.fm.updated || p.fm.date;
      if (p.fm.type === 'home') lastmod = [lastmod, lastPost(p.lang)].filter(Boolean).sort().pop();
      // xhtml:link alternates only for hreflang pairs (homes, translation_key pages).
      (p.kind === 'posts' ? postEntries : pageEntries).push({ loc: p.absUrl, lastmod, alternates: p.alternates || [] });
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
        domain: site.domain, title: site.meta.name, lang, feedPath: `${prefix}/rss.xml`, homePath: `${prefix}/`, posts,
        description: stripMarkers(home?.fm.description || forLang(project, site.config.tagline, lang) || site.meta.role),
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
  const { missing } = fontFiles();
  if (missing.length) add('warning', 'fonts', null, `${missing.length} font file(s) not found (${missing.slice(0, 3).join(', ')}…): run npm ci (the @fontsource devDependencies); pages fall back to system fonts`);
  const overlayFiles = new Set(overlay.map(o => path.normalize(o.file).split(path.sep).join('/')));
  const focus = focusOverlay ? new Set(pages.filter(p => overlayFiles.has(p.file))) : null;
  runGates({ project, pages, generated, outputs, today, add, focus });
  for (const x of excluded) add('info', 'excluded', { file: x.file }, x.reason);

  const errors = findings.filter(f => f.level === 'error');
  const warnings = findings.filter(f => f.level === 'warning');
  // Sites that cannot be written/deployed: their own errors, or every site when an error has no site (registry...).
  const blocked = errors.some(e => !e.site) ? [...outputs.keys()] : [...new Set(errors.map(e => e.site))];
  const report = { generated_at: new Date().toISOString(), today, errors: errors.length, warnings: warnings.length, pages: pages.length, blocked_sites: blocked, findings };
  writeFile(path.join(outDir, '_reports', 'gates.json'), JSON.stringify(report, null, 2) + '\n');

  const written = [];
  if (write) {
    for (const [domain, files] of outputs) {
      if (only && !only.includes(domain)) continue;
      if (!files.size || (strict && blocked.includes(domain))) continue;
      const dir = path.join(outDir, domain);
      fs.rmSync(dir, { recursive: true, force: true });
      for (const [file, content] of files) writeFile(path.join(dir, file), content);
      written.push({ domain, files: files.size });
    }
  }
  return { project, pages, generated, outputs, findings, errors, warnings, excluded, written, blocked, report };
}

// Console summary used by scripts/build.js and scripts/check.js.
export function printFindings(findings, { verbose = false } = {}) {
  const fmt = f => `  [${f.gate}] ${[f.site, f.file || f.url].filter(Boolean).join(' ')}: ${f.msg}`;
  const errors = findings.filter(f => f.level === 'error'), warnings = findings.filter(f => f.level === 'warning');
  if (errors.length) console.error(`\n${errors.length} error(s):\n` + errors.map(fmt).join('\n'));
  if (warnings.length) console.warn(`\n${warnings.length} warning(s):\n` + (verbose ? warnings : warnings.slice(0, 40)).map(fmt).join('\n') + (!verbose && warnings.length > 40 ? `\n  … ${warnings.length - 40} more in dist/_reports/gates.json` : ''));
}
