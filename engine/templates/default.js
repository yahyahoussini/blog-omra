// Default templates. Each returns an HTML string. A theme can override any of them through
// themes/<domain>/theme.js -> templates: { name(ctx, ...args, defaults) }.
// Stable class names are documented in docs/ENGINE.md.
import { esc, stripMarkers, formatDate, fill } from '../lib/util.js';

const attr = (name, v) => (v ? ` ${name}="${esc(v)}"` : '');

export function layout(ctx, d) {
  const { site, L, lang } = ctx;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fonts = (site.theme.fonts || []).filter(f => f && f !== 'system');
  const fontLinks = fonts.length
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&')}&display=swap">`
    : '';
  const hreflang = (d.alternates || []).map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n');
  return `<!doctype html>
<html lang="${lang}-MA" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description)}">
<link rel="canonical" href="${esc(d.canonical)}">
${d.noindex ? '<meta name="robots" content="noindex">\n' : ''}${hreflang}
<meta property="og:type" content="${d.ogType || 'website'}">
<meta property="og:title" content="${esc(d.title)}">
<meta property="og:description" content="${esc(d.description)}">
<meta property="og:url" content="${esc(d.canonical)}">
<meta property="og:site_name" content="${esc(site.meta.name)}">
<meta property="og:locale" content="${lang}_MA">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(d.title)}">
<meta name="twitter:description" content="${esc(d.description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${ctx.hasFeed ? `<link rel="alternate" type="application/rss+xml" title="${esc(site.meta.name)}" href="${ctx.prefix}/rss.xml">\n` : ''}${fontLinks}
<style>${ctx.css}</style>
${d.jsonld}
</head>
<body class="site site--${esc(site.theme.id.replace(/\./g, '-'))} page--${esc(d.pageType || 'page')}">
<a class="skip-link" href="#contenu">${esc(L.skip)}</a>
${ctx.t('header')}
<main id="contenu" class="site-main">
${d.main}
</main>
${ctx.t('footer')}
</body>
</html>
`;
}

export function header(ctx) {
  const { site, L } = ctx;
  const layoutName = site.theme.layout?.header || 'split';
  const items = ctx.nav.map(n => `<li class="site-nav__item"><a class="site-nav__link" href="${esc(n.url)}"${n.current ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`).join('');
  return `<header class="site-header site-header--${esc(layoutName)}">
<div class="site-header__inner">
<a class="site-brand" href="${ctx.prefix}/"><span class="site-brand__name">${esc(site.config.name || site.meta.name)}</span>${site.config.tagline ? `<span class="site-brand__tagline">${esc(site.config.tagline)}</span>` : ''}</a>
${items ? `<nav class="site-nav" aria-label="${esc(L.mainNav)}"><ul class="site-nav__list">${items}</ul></nav>` : ''}
</div>
</header>`;
}

export function footer(ctx) {
  const { L } = ctx;
  const items = ctx.footerNav.map(n => `<li><a href="${esc(n.url)}">${esc(n.label)}</a></li>`).join('');
  return `<footer class="site-footer">
<div class="site-footer__inner">
${items ? `<nav class="site-footer__nav" aria-label="${esc(L.footerNav)}"><ul>${items}</ul></nav>` : ''}
<p class="site-footer__owner"><a href="${esc(ctx.editeurUrl)}">${esc(L.ownerLine)}</a></p>
</div>
</footer>`;
}

export function breadcrumbs(ctx, crumbs) {
  if (crumbs.length < 2) return '';
  const li = crumbs.map((c, i) => i === crumbs.length - 1
    ? `<li class="breadcrumbs__item" aria-current="page">${esc(c.name)}</li>`
    : `<li class="breadcrumbs__item"><a href="${esc(c.url)}">${esc(c.name)}</a></li>`).join('');
  return `<nav class="breadcrumbs" aria-label="${esc(ctx.L.breadcrumb)}"><ol class="breadcrumbs__list">${li}</ol></nav>`;
}

export function card(ctx, p) {
  const fm = p.fm;
  return `<li class="card card--${esc(fm.type)}"><a class="card__link" href="${esc(p.url)}"><span class="card__title">${esc(stripMarkers(fm.title))}</span></a>
<p class="card__summary">${esc(stripMarkers(fm.summary || fm.description))}</p>${p.kind === 'posts' ? `<p class="card__meta"><time datetime="${fm.date}">${esc(formatDate(fm.date, ctx.lang))}</time></p>` : ''}</li>`;
}

export const cardList = (ctx, list, cls = 'cards') => (list.length ? `<ul class="${cls}">${list.map(p => ctx.t('card', p)).join('\n')}</ul>` : '');

export function byline(ctx, page) {
  const { L, lang } = ctx;
  const fm = page.fm;
  const author = ctx.author
    ? esc(ctx.author.name)
    : `<a href="${esc(ctx.editeurUrl)}">${esc(L.orgName)}</a>`;
  const updated = fm.updated && fm.updated !== fm.date ? ` · ${esc(L.updated)} <time datetime="${fm.updated}">${esc(formatDate(fm.updated, lang))}</time>` : '';
  let out = `<p class="byline__meta">${esc(L.byPrefix)} ${author} · ${esc(L.published)} <time datetime="${fm.date}">${esc(formatDate(fm.date, lang))}</time>${updated}</p>`;
  if (ctx.reviewer) out += `<p class="byline__review">${esc(fill(L.reviewedBy, { name: ctx.reviewer.name, role: ctx.reviewer.role, date: formatDate(fm.reviewed_at, lang) }))}</p>`;
  if (fm.tier === 'C') out += `<p class="byline__ai">${esc(L.aiLine)}${ctx.checkedLine ? ' ' + esc(ctx.checkedLine) : ''}</p>`;
  if (fm.tier === 'B') out += `<p class="byline__ai">${esc(L.dataLine)}${ctx.checkedLine ? ' ' + esc(ctx.checkedLine) : ''}</p>`;
  return `<div class="byline">${out}</div>`;
}

export function sources(ctx, list) {
  if (!list.length) return '';
  const { L, lang } = ctx;
  const li = list.map(s => {
    const label = s.title ? `${esc(s.title)}</a> — ${esc(s.publisher)}` : `${esc(s.publisher)}</a>`;
    const when = s.accessed ? `, ${esc(fill(L.sourceAccessed, { date: formatDate(s.accessed, lang) }))}` : '';
    return `<li id="src-${s.n}" class="sources__item"><a href="${esc(s.url)}">${label}${when}</li>`;
  }).join('\n');
  const checked = ctx.page.fm.tier !== 'C' && ctx.page.fm.tier !== 'B' && ctx.checkedLine ? `<p class="sources__checked">${esc(ctx.checkedLine)}</p>` : '';
  return `<section class="sources" aria-labelledby="sources-title"><h2 class="sources__title" id="sources-title">${esc(L.sources)}</h2>
<ol class="sources__list">${li}</ol>${checked}</section>`;
}

export function faq(ctx, items) {
  if (!items.length) return '';
  return `<section class="faq" aria-labelledby="faq-title"><h2 class="faq__title" id="faq-title">${esc(ctx.L.faq)}</h2>
${items.map(f => `<div class="faq__item"><h3 class="faq__q">${esc(f.q)}</h3><div class="faq__a">${f.aHtml}</div></div>`).join('\n')}
</section>`;
}

// WhatsApp CTA. wa = { href, ref, external } ; wt = optional wikitours.ma link for cta.type "wikitours".
export function cta(ctx, { wa, wt }) {
  const { L } = ctx;
  const rel = wa.external ? ' rel="nofollow noopener"' : '';
  const wtHtml = wt ? `<p class="cta__wt">${esc(L.wtLead)} <a href="${esc(wt.href)}" rel="${esc(wt.rel)}" class="wt-link">${esc(wt.anchor)}</a>${wt.note ? `<span class="lang-note">${esc(wt.note)}</span>` : ''}</p>` : '';
  return `<aside class="cta" aria-label="${esc(L.ctaTitle)}">
<p class="cta__title">${esc(L.ctaTitle)}</p>
<p class="cta__text">${esc(wa.external ? L.ctaText : L.ctaFallbackText)}</p>
<a class="cta__button" href="${esc(wa.href)}"${rel}>${esc(L.ctaButton)}</a>
<p class="cta__ref">${esc(L.ctaRef)} : <span>${esc(wa.ref)}</span></p>
${wtHtml}</aside>`;
}

export function article(ctx, page, parts) {
  const order = ctx.site.theme.sectionOrder || ['body', 'cluster', 'faq', 'cta', 'sources', 'related'];
  const blocks = {
    body: `<div class="article__body prose">\n${parts.bodyHtml}</div>`,
    cluster: parts.clusterList ? `<nav class="cluster-list" aria-labelledby="cluster-title"><h2 class="cluster-list__title" id="cluster-title">${esc(ctx.L.inCluster)}</h2>${parts.clusterList}</nav>` : '',
    faq: ctx.t('faq', parts.faq),
    cta: parts.ctaHtml || '',
    sources: ctx.t('sources', parts.sources),
    related: parts.related ? `<nav class="related" aria-labelledby="related-title"><h2 class="related__title" id="related-title">${esc(ctx.L.related)}</h2>${parts.related}</nav>` : '',
  };
  return `${ctx.t('breadcrumbs', parts.crumbs)}
<article class="article article--${esc(page.fm.type)}">
<header class="article__header">
<h1 class="article__title">${esc(stripMarkers(page.fm.title))}</h1>
${page.fm.type === 'home' ? '' : ctx.t('byline', page)}
${parts.stale ? `<p class="stale-banner" role="status">${esc(ctx.L.staleBanner)}</p>` : ''}
</header>
${order.map(k => blocks[k] || '').filter(Boolean).join('\n')}
</article>`;
}

export function home(ctx, page, parts) {
  const { L, site } = ctx;
  const sections = site.config.home?.sections || site.theme.layout?.home || ['hero', 'intro', 'pillars', 'latest', 'cta', 'about'];
  const title = esc(stripMarkers(page.fm.title));
  const blocks = {
    hero: `<section class="home-hero"><h1 class="home-hero__title">${title}</h1>${site.config.tagline ? `<p class="home-hero__tagline">${esc(site.config.tagline)}</p>` : ''}</section>`,
    intro: `<section class="home-intro prose">\n${parts.bodyHtml}</section>`,
    pillars: parts.pillars ? `<section class="home-pillars"><h2 class="home-section__title">${esc(L.pillars)}</h2>${parts.pillars}</section>` : '',
    latest: parts.latest ? `<section class="home-latest"><h2 class="home-section__title">${esc(L.latest)}</h2>${parts.latest}</section>` : '',
    cta: parts.ctaHtml || '',
    about: `<section class="home-about"><h2 class="home-section__title">${esc(L.about)}</h2><p>${esc(L.aboutText)}</p><p><a href="${esc(ctx.editeurUrl)}">${esc(L.aboutLink)}</a></p></section>`,
  };
  const h1 = sections.includes('hero') ? '' : `<h1 class="home-title">${title}</h1>`;
  return `<div class="home">${h1}\n${sections.map(s => blocks[s] || '').filter(Boolean).join('\n')}\n</div>`;
}

export function listing(ctx, d) {
  const { L } = ctx;
  const pager = d.totalPages > 1 ? `<nav class="pager" aria-label="${esc(L.pagination)}">
${d.prevUrl ? `<a class="pager__prev" rel="prev" href="${esc(d.prevUrl)}">${esc(L.prev)}</a>` : ''}
${d.nextUrl ? `<a class="pager__next" rel="next" href="${esc(d.nextUrl)}">${esc(L.next)}</a>` : ''}
</nav>` : '';
  return `${ctx.t('breadcrumbs', d.crumbs)}
<section class="listing">
<h1 class="listing__title">${esc(d.heading)}</h1>
${d.intro ? `<p class="listing__intro">${esc(d.intro)}</p>` : ''}
${cardList(ctx, d.items) || `<p>${esc(L.empty)}</p>`}
${pager}
</section>`;
}

export function notFound(ctx) {
  const { L } = ctx;
  return `<section class="not-found"><h1 class="not-found__title">${esc(L.notFoundTitle)}</h1><p>${esc(L.notFoundText)}</p><p><a href="${ctx.prefix}/">${esc(L.backHome)}</a></p></section>`;
}
