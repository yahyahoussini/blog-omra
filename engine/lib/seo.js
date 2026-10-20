// Site-level files: sitemaps, RSS, robots.txt, Cloudflare Pages _headers / _redirects, favicon.
import { esc, stripMarkers } from './util.js';

const xmlEsc = esc;

// entries: [{ loc, lastmod }]
export function sitemapXml(entries) {
  const urls = entries.map(e => `  <url><loc>${xmlEsc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function sitemapIndexXml(parts) {
  const items = parts.map(p => `  <sitemap><loc>${xmlEsc(p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

const rfc822 = ymd => new Date(ymd + 'T06:00:00Z').toUTCString();

// RSS 2.0 with the last 50 posts.
export function rssXml({ domain, title, description, lang, feedPath, posts }) {
  const items = posts.slice(0, 50).map(p => `    <item>
      <title>${xmlEsc(stripMarkers(p.fm.title))}</title>
      <link>https://${domain}${p.url}</link>
      <guid isPermaLink="true">https://${domain}${p.url}</guid>
      <pubDate>${rfc822(p.fm.date)}</pubDate>
      <description>${xmlEsc(stripMarkers(p.fm.summary || p.fm.description))}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEsc(title)}</title>
    <link>https://${domain}/</link>
    <description>${xmlEsc(description)}</description>
    <language>${lang}-MA</language>
    <atom:link href="https://${domain}${feedPath}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

// STRATEGY 9.4 baseline. Search / answer bots always allowed; training bots per config.
export function robotsTxt(project, domain) {
  const r = project.network.robots || {};
  const lines = ['# Search and answer bots (kept allowed, STRATEGY 9.4)'];
  for (const bot of r.search_bots || []) lines.push(`User-agent: ${bot}`);
  lines.push('Allow: /', 'Disallow: /go/', '');
  const training = Object.entries(r.training_bots || {});
  if (training.length) {
    lines.push('# Training tokens: business choice in config/network.json (blocking does not remove a site from their search)');
    for (const [bot, mode] of training.filter(([, m]) => m !== 'block')) lines.push(`User-agent: ${bot}`);
    if (training.some(([, m]) => m !== 'block')) lines.push('Allow: /', 'Disallow: /go/', '');
    const blocked = training.filter(([, m]) => m === 'block');
    for (const [bot] of blocked) lines.push(`User-agent: ${bot}`);
    if (blocked.length) lines.push('Disallow: /', '');
  }
  lines.push('User-agent: *', 'Allow: /', 'Disallow: /go/', '', `Sitemap: https://${domain}/sitemap-index.xml`, '');
  return lines.join('\n');
}

// Security headers + caching for Cloudflare Pages. pages.dev copies are kept out of the index.
export function headersFile(site) {
  const csp = [
    "default-src 'self'", "img-src 'self' data:", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "script-src 'self'", "connect-src 'self'",
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
  ].join('; ');
  const lines = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: DENY',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
    '  Strict-Transport-Security: max-age=31536000',
    `  Content-Security-Policy: ${csp}`,
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.xml',
    '  Cache-Control: public, max-age=3600',
    '',
  ];
  if (site.meta.cf_project) lines.push(`https://:version.${site.meta.cf_project}.pages.dev/*`, '  X-Robots-Tag: noindex', '', `https://${site.meta.cf_project}.pages.dev/*`, '  X-Robots-Tag: noindex', '');
  return lines.join('\n');
}

// config/sites/<domain>.json -> redirects: [{ from, to, status }]
export function redirectsFile(site) {
  const rules = (site.config.redirects || []).map(r => `${r.from} ${r.to} ${r.status || 301}`);
  return (rules.length ? rules.join('\n') : '# No redirects (add them in config/sites/' + site.domain + '.json -> redirects)') + '\n';
}

// A tiny geometric favicon in the theme colours.
export function faviconSvg(theme) {
  const p = theme.palette || {};
  const bg = p.primary || '#234', fg = p.accent || '#fc6';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${bg}"/><path d="M16 5l3.2 7.8L27 16l-7.8 3.2L16 27l-3.2-7.8L5 16l7.8-3.2z" fill="${fg}"/></svg>\n`;
}
