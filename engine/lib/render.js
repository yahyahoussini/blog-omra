// Renders content pages and generated pages (listings, hubs, 404) to full HTML strings.
import * as defaults from '../templates/default.js';
import { esc, stripMarkers, fill } from './util.js';
import { formatDate, formatNumber, langInfo } from './i18n.js';
import { siteCss, defaultTheme } from './theme.js';
import { PRELOAD, hasFont } from './fonts.js';
import { renderMarkdown, renderInline, gateText, plainText, findRawHtml, MENTION, NOGATE } from './markdown.js';
import { buildSources, resolveShortcodes, resolveSlug, factIdsIn } from './shortcodes.js';
import { langPrefix, group } from './content.js';
import { waLink, refCode } from './wa.js';
import { buildJsonLd, jsonLdScript } from './schema.js';

const PILLAR_TYPES = new Set(['pillar', 'hub']);

// Per-language site text. A plain value belongs to the base language only; an object keyed by
// language ({ fr, ar, en }) gives one value per language (site config: tagline, blog).
export function forLang(project, value, lang) {
  if (value && typeof value === 'object' && ['fr', 'ar', 'en'].some(k => k in value)) return value[lang] ?? null;
  return lang === (project.network.base_lang || 'fr') ? value ?? null : null;
}

// Facts used, stale facts and the final noindex decision. Runs for every page before any page renders,
// so templates know which pages (and RSS feeds) really exist.
export function prepareStale(ctx, page) {
  const { project } = ctx;
  const fm = page.fm;
  page.factsUsed = [...new Set([...factIdsIn(fm.title), ...factIdsIn(fm.description), ...factIdsIn(page.body),
    ...(fm.faq || []).flatMap(f => [...factIdsIn(f.q), ...factIdsIn(f.a)]), ...(fm.facts_used || [])])];
  // Facts past review_by / valid_until: the page shows a banner (registry rule 4).
  page.staleFacts = page.factsUsed.filter(id => {
    const f = project.registry[id];
    return f && ((f.review_by && f.review_by < ctx.today) || (f.valid_until && f.valid_until < ctx.today));
  });
  const limit = new Date(Date.parse(ctx.today) - 14 * 864e5).toISOString().slice(0, 10);
  page.dropFromSitemap = page.staleFacts.some(id => project.registry[id].review_by < limit);
  page.noindexFinal = !!fm.noindex || page.dropFromSitemap;
  return page;
}

const hasFeed = (ctx, site, lang) => group(ctx, site, lang).some(p => p.kind === 'posts' && !p.noindexFinal);

// The network's other sites, one line each, nofollow (trust pages, :::network).
function networkHtml(ctx, site, lang) {
  const items = [...ctx.project.sites.values()].filter(s => s.domain !== site.domain).map(s => {
    const tagline = forLang(ctx.project, s.config.tagline, lang);
    return `<li><a href="https://${esc(s.domain)}/" rel="nofollow" class="network-link">${esc(s.config.name || s.meta.name)}</a> (${esc(s.domain)})${tagline ? ` : ${esc(tagline)}` : ''}</li>`;
  });
  return `<ul class="network-list__items">${items.join('')}</ul>`;
}

// Template context for one site + language. ctx = { project, pages, index, today, warn }
// Nav lists per language: { fr: [...], ar: [...], en: [...] }, or one list whose entries carry "lang" (no lang = base language).
export function navFor(project, list, lang) {
  if (list && !Array.isArray(list)) return list[lang] || [];
  return (list || []).filter(n => (n.lang || project.network.base_lang || 'fr') === lang);
}

// Language switcher: every language of the site that has a home page. Target = the page sharing this page's
// translation_key in that language (the home for home pages), otherwise that language's home.
export function languageLinks(ctx, site, lang, currentUrl, page) {
  const out = [];
  for (const l of site.meta.languages) {
    const pages = group(ctx, site.domain, l);
    const home = pages.find(p => p.fm.type === 'home');
    if (!home) continue;
    let target = null;
    if (l === lang) target = currentUrl ? { url: currentUrl } : home;
    else if (page?.fm.type === 'home') target = home;
    else if (page?.fm.translation_key && !page.noindexFinal) target = pages.find(p => p.fm.translation_key === page.fm.translation_key && p.fm.type !== 'home' && !p.noindexFinal);
    out.push({ lang: l, url: (target || home).url, current: l === lang, label: langInfo(l).short, name: langInfo(l).name, translated: !!target && l !== lang });
  }
  return out.length > 1 ? out : [];
}

export function templateCtx(ctx, site, lang, currentUrl, page = null) {
  const L = site.labels[lang] || site.labels.fr;
  const prefix = langPrefix(ctx.project, lang);
  const preload = PRELOAD[lang];
  const resolveNav = list => navFor(ctx.project, list, lang)
    .map(n => {
      const t = resolveSlug(ctx, site.domain, lang, n.slug);
      if (!t) { if (n.slug !== 'blog') ctx.navErrors.push({ site: site.domain, msg: `navigation entry "${n.slug}" does not resolve` }); return null; }
      return { label: n.label, url: t.url, current: t.url === currentUrl };
    }).filter(Boolean);
  const tctx = {
    project: ctx.project, site, lang, L, prefix, page,
    css: siteCss(ctx.project.root, site),
    langInfo: langInfo(lang),
    languages: languageLinks(ctx, site, lang, currentUrl, page),
    themeDefault: defaultTheme(site.theme),
    fontPreload: preload && hasFont(preload) ? `/assets/fonts/${preload}` : null,
    tagline: forLang(ctx.project, site.config.tagline, lang),
    hasFeed: hasFeed(ctx, site.domain, lang),
    nav: resolveNav(site.config.nav),
    footerNav: resolveNav(site.config.footer_nav),
    editeurUrl: resolveSlug(ctx, site.domain, lang, 'editeur')?.url || `${prefix}/editeur/`,
  };
  tctx.t = (name, ...args) => {
    const own = site.theme.templates?.[name];
    return own ? own(tctx, ...args, defaults) : defaults[name](tctx, ...args);
  };
  return tctx;
}

export function disclosureBox(L) {
  return `<aside class="box box--disclosure">${NOGATE(`<p class="box__label">${esc(L.disclosure)}</p><p>${esc(L.disclosureText)}</p>`)}</aside>`;
}

// CTA block for a page; also returns the wikitours.ma link it adds (counted by the links gate).
function buildCta(ctx, tctx, page, topicOverride) {
  const { site, L } = tctx;
  const fmCta = page.fm.cta || { type: 'whatsapp' };
  const topic = topicOverride || fmCta.topic || forLang(ctx.project, site.config.whatsapp?.default_topic, page.lang) || tctx.L.waTopic || site.meta.name;
  const number = site.config.whatsapp?.number;
  let wa;
  if (number) {
    const w = waLink({ number, site: site.domain, siteRef: site.meta.ref, pageId: page.pageId, lang: page.lang, topic });
    wa = { href: w.href, ref: w.ref, external: true };
  } else {
    wa = { href: resolveSlug(ctx, site.domain, page.lang, 'contact')?.url || `${tctx.prefix}/contact/`, ref: refCode(site.meta.ref, page.pageId), external: false };
  }
  let wt = null;
  if (fmCta.type === 'wikitours') {
    const t = ctx.project.wtTargets[fmCta.wt_target];
    if (t) {
      const policy = ctx.project.linkPolicy;
      wt = { href: t.url, anchor: t.label, rel: policy.money_link_rel || 'nofollow', note: t.lang !== page.lang ? policy.money_link_lang_note?.[page.lang] : '', target: t };
    }
  }
  return { html: tctx.t('cta', { wa, wt }), wt, wa };
}

function checkedLine(L, sources, lang) {
  const dates = sources.map(s => s.accessed).filter(Boolean).sort();
  if (!dates.length) return '';
  const from = dates[0], to = dates[dates.length - 1];
  return from === to ? fill(L.sourcesChecked, { date: formatDate(from, lang) })
    : fill(L.sourcesCheckedRange, { from: formatDate(from, lang), to: formatDate(to, lang) });
}

const byDateDesc = (a, b) => String(b.fm.date).localeCompare(String(a.fm.date)) || a.fm.slug.localeCompare(b.fm.slug);

export function clusterPillar(ctx, page) {
  if (!page.fm.cluster) return null;
  return group(ctx, page.site, page.lang).filter(p => p.kind === 'pages' && PILLAR_TYPES.has(p.fm.type) && p.fm.cluster === page.fm.cluster)
    .sort((a, b) => (a.fm.nav_order ?? 999) - (b.fm.nav_order ?? 999))[0] || null;
}

// Renders one content page. Stores everything the gates need on the page object.
export function renderContentPage(ctx, page) {
  const { project } = ctx;
  const site = project.sites.get(page.site);
  const tctx = templateCtx(ctx, site, page.lang, page.url, page);
  const L = tctx.L;
  const fm = page.fm;

  if (page.noindexFinal === undefined) prepareStale(ctx, page);
  const { sources, factNum } = buildSources(page, project);
  const body = resolveShortcodes(page.body, page, ctx, factNum);
  page.links = body.links.map(l => ({ ...l, where: 'body' }));
  page.linkErrors = [...body.errors];
  page.linkWarnings = [...body.warnings];
  // Raw HTML is escaped by the renderer and reported as a gate error (markdown.js).
  page.rawHtml = findRawHtml(body.text);
  const faq = (fm.faq || []).map(f => {
    const r = resolveShortcodes(f.a, page, ctx, factNum);
    page.links.push(...r.links.map(l => ({ ...l, where: 'faq' })));
    page.linkErrors.push(...r.errors);
    page.linkWarnings.push(...r.warnings);
    page.rawHtml.push(...findRawHtml(r.text, { inline: true }), ...findRawHtml(f.q, { inline: true }));
    return { q: stripMarkers(f.q), qRaw: f.q, aHtml: renderInline(r.text, { snippets: r.snippets }) };
  });

  const cta = fm.cta?.type === 'none' ? null : buildCta(ctx, tctx, page);
  if (cta?.wt) page.links.push({ kind: 'wt', href: cta.wt.href, anchor: cta.wt.anchor, target: cta.wt.target, where: 'cta' });
  const mentionOutside = MENTION.test([fm.title, fm.description, fm.summary, ...(fm.faq || []).flatMap(f => [f.q, f.a])].join(' '));
  const env = {
    labels: L,
    disclosureHtml: disclosureBox(L),
    forceDisclosure: mentionOutside || page.links.some(l => l.kind === 'wt'),
    renderCta: topic => buildCta(ctx, tctx, page, topic).html,
    snippets: body.snippets,
    networkHtml: networkHtml(ctx, site, page.lang),
  };
  const r = renderMarkdown(body.text, env);
  Object.assign(page, { bodyHtml: r.html, disclosed: r.disclosed, hasUnknown: r.hasUnknown, answerWords: r.answerWords, images: r.images, tools: r.tools, sources, faqRendered: faq });

  page.gateTexts = [
    { field: 'title', text: fm.title },
    { field: 'description', text: fm.description },
    ...(fm.summary ? [{ field: 'summary', text: fm.summary }] : []),
    { field: 'body', text: gateText(r.html) },
    ...faq.map((f, i) => ({ field: `faq[${i}]`, text: `${f.qRaw}\n${gateText(f.aHtml)}` })),
    ...r.images.map((im, i) => ({ field: `alt[${i}]`, text: im.alt })),
  ];
  page.plain = plainText(r.html);

  // Breadcrumbs, related posts, cluster list.
  const home = { name: L.home, url: `${tctx.prefix}/` };
  const pillar = page.kind === 'posts' ? clusterPillar(ctx, page) : null;
  let crumbs;
  if (fm.type === 'home') crumbs = [home];
  else if (page.kind === 'posts') crumbs = [home, pillar ? { name: stripMarkers(pillar.fm.title), url: pillar.url } : { name: L.blog, url: `${tctx.prefix}/blog/` }, { name: stripMarkers(fm.title), url: page.url }];
  else crumbs = [home, { name: stripMarkers(fm.title), url: page.url }];
  page.crumbs = crumbs;

  const posts = group(ctx, page.site, page.lang).filter(p => p.kind === 'posts');
  const related = page.kind === 'posts' && fm.cluster ? posts.filter(p => p !== page && p.fm.cluster === fm.cluster).sort(byDateDesc).slice(0, 4) : [];
  const clusterPosts = page.kind === 'pages' && PILLAR_TYPES.has(fm.type) && fm.cluster ? posts.filter(p => p.fm.cluster === fm.cluster).sort(byDateDesc) : [];

  const author = fm.author && fm.author !== 'org' ? project.authors.find(a => a.id === fm.author) : null;
  const reviewer = fm.reviewed_by && fm.full_read ? project.authors.find(a => a.id === fm.reviewed_by) : null;
  Object.assign(tctx, { author, reviewer, checkedLine: checkedLine(L, sources, page.lang) });

  const parts = {
    bodyHtml: r.html, crumbs, faq, sources, stale: page.staleFacts.length > 0,
    ctaHtml: cta && !r.html.includes('class="cta"') ? cta.html : '',
    ctaLink: cta?.wa || null, // the cover band's primary button (home)
    related: defaults.cardList(tctx, related),
    clusterList: defaults.cardList(tctx, clusterPosts),
  };
  let main;
  if (fm.type === 'home') {
    const pillars = group(ctx, page.site, page.lang).filter(p => p.kind === 'pages' && !['home', 'trust'].includes(p.fm.type) && !p.fm.noindex)
      .sort((a, b) => (a.fm.nav_order ?? 999) - (b.fm.nav_order ?? 999) || a.fm.title.localeCompare(b.fm.title));
    main = tctx.t('home', page, { ...parts, pillars: defaults.cardList(tctx, pillars), latest: defaults.cardList(tctx, posts.sort(byDateDesc).slice(0, 6)) });
  } else {
    main = tctx.t('article', page, parts);
  }

  const alternates = page.alternates = hreflangAlternates(ctx, page);
  const title = stripMarkers(fm.title), description = stripMarkers(fm.description);
  const jsonld = buildJsonLd(project, {
    site, page, kind: fm.type === 'home' ? 'home' : 'content', title, description, url: page.url, lang: page.lang, crumbs,
    author: author ? { '@type': 'Person', name: author.name, ...(author.url ? { url: author.url } : {}) } : null,
    languages: fm.type === 'home' ? ctx.pages.filter(p => p.site === page.site && p.fm.type === 'home' && !p.noindexFinal).map(p => p.lang) : null,
  });
  page.jsonld = jsonld;
  page.html = tctx.t('layout', {
    title, description, canonical: page.absUrl, noindex: page.noindexFinal, alternates,
    ogType: page.kind === 'posts' ? 'article' : 'website', jsonld: jsonLdScript(jsonld), main, pageType: fm.type,
    scripts: r.tools.map(name => `/assets/${name}.js`),
  });
  return page;
}

// hreflang only between versions of the same page on the same site (DECISIONS D-H): home pages always; other pages
// only through a shared translation_key (one page per language). Never across domains, never to a noindexed version.
// Values fr-MA, ar-MA, en; x-default = the French version, or the page itself when there is none.
export function hreflangAlternates(ctx, page) {
  const fm = page.fm;
  if (!(fm.translation_key || fm.type === 'home') || page.noindexFinal) return [];
  const versions = ctx.pages.filter(p => p.site === page.site && !p.noindexFinal
    && (fm.type === 'home' ? p.fm.type === 'home' : p.fm.type !== 'home' && p.fm.translation_key === fm.translation_key));
  const byLang = new Map();
  for (const v of versions) if (!byLang.has(v.lang)) byLang.set(v.lang, v);
  byLang.set(page.lang, page);
  if (byLang.size < 2) return [];
  const base = byLang.get(ctx.project.network.base_lang || 'fr') || page;
  return [...[...byLang.values()].map(v => ({ hreflang: langInfo(v.lang).hreflang, href: v.absUrl })), { hreflang: 'x-default', href: base.absUrl }];
}

// Generated pages for one site + language: blog listing (paginated), cluster hubs, 404.
// Returns [{ url, html, title, description, sitemap, lastmod, kind }]
export function renderGeneratedPages(ctx, site, lang) {
  const { project } = ctx;
  const out = [];
  const tctx0 = templateCtx(ctx, site, lang, null);
  const L = tctx0.L, prefix = tctx0.prefix;
  const posts = group(ctx, site.domain, lang).filter(p => p.kind === 'posts').sort(byDateDesc);
  const home = { name: L.home, url: `${prefix}/` };
  const make = (url, d, extra = {}) => {
    const tctx = templateCtx(ctx, site, lang, url);
    const jsonld = buildJsonLd(project, { site, kind: d.kind || 'collection', title: d.title, description: d.description, url, lang, crumbs: d.crumbs });
    const html = tctx.t('layout', { title: d.title, description: d.description, canonical: `https://${site.domain}${url}`, noindex: d.noindex,
      jsonld: jsonLdScript(jsonld), main: d.main(tctx), pageType: d.pageType || 'listing' });
    out.push({ url, html, title: d.title, description: d.description, kind: d.pageType || 'listing', jsonld, ...extra });
  };

  if (posts.length) {
    const per = project.network.posts_per_page || 12;
    const total = Math.ceil(posts.length / per);
    // config/sites -> blog: { title, description, intro } for the base language, or { fr: {…}, ar: {…}, en: {…} }.
    const blogCfg = forLang(project, site.config.blog, lang) || {};
    const homeDesc = stripMarkers(group(ctx, site.domain, lang).find(p => p.fm.type === 'home')?.fm.description || '');
    const desc = blogCfg.description || (tctx0.tagline ? fill(L.blogDescription, { blog: L.blogTitle, site: site.meta.name, tagline: tctx0.tagline }) : homeDesc || L.blogTitle);
    for (let n = 1; n <= total; n++) {
      const url = n === 1 ? `${prefix}/blog/` : `${prefix}/blog/page/${n}/`;
      const heading = blogCfg.title || `${L.blogTitle} – ${site.meta.name}`;
      const title = n === 1 ? heading : `${heading} (${fill(L.pageN, { n: formatNumber(n, lang) })})`;
      const crumbs = n === 1 ? [home, { name: L.blog, url }] : [home, { name: L.blog, url: `${prefix}/blog/` }, { name: fill(L.pageN, { n: formatNumber(n, lang) }), url }];
      make(url, {
        title, description: n === 1 ? desc : `${desc} (${fill(L.pageN, { n: formatNumber(n, lang) })})`, crumbs,
        main: t => t.t('listing', { heading: title, intro: n === 1 ? blogCfg.intro : null, items: posts.slice((n - 1) * per, n * per), crumbs, totalPages: total,
          prevUrl: n > 1 ? (n === 2 ? `${prefix}/blog/` : `${prefix}/blog/page/${n - 1}/`) : null,
          nextUrl: n < total ? `${prefix}/blog/page/${n + 1}/` : null }),
      }, { sitemap: n === 1, lastmod: posts[0].fm.updated || posts[0].fm.date });
    }
  }

  // Cluster hubs: only for clusters with >= 3 posts, no pillar/hub page, and a title in site config.
  const clusters = site.config.clusters || {};
  for (const id of [...new Set(posts.map(p => p.fm.cluster).filter(Boolean))]) {
    const members = posts.filter(p => p.fm.cluster === id);
    const cfg = clusters[id]?.[lang] || (lang === (project.network.base_lang || 'fr') ? clusters[id] : null);
    if (members.length < 3 || !cfg?.title || clusterPillar(ctx, members[0])) continue;
    const url = `${prefix}/sujets/${id.replace(/_/g, '-')}/`;
    const crumbs = [home, { name: cfg.title, url }];
    make(url, { title: cfg.title, description: cfg.description || cfg.title, crumbs,
      main: t => t.t('listing', { heading: cfg.title, intro: cfg.intro, items: members, crumbs, totalPages: 1 }) },
    { sitemap: true, lastmod: members[0].fm.updated || members[0].fm.date, hub: id });
  }

  // 404 (base language only; Cloudflare Pages serves /404.html).
  if (lang === (project.network.base_lang || 'fr')) {
    make('/404.html', { title: `${L.notFoundTitle} – ${site.meta.name}`, description: L.notFoundText, noindex: true, crumbs: [], kind: 'notfound', pageType: 'notfound',
      main: t => t.t('notFound') }, { sitemap: false, file: '404.html' });
  }
  return out;
}
