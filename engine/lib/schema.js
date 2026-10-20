// JSON-LD @graph per page (STRATEGY 4.3). Organization publisher everywhere — never
// LocalBusiness / TravelAgency on a satellite, never Event, HowTo or self-serving reviews.
import { stripMarkers } from './util.js';
import { plainText, renderInline } from './markdown.js';

export function organizationNode(publisher) {
  const org = { '@type': 'Organization', '@id': publisher['@id'], name: publisher.name, url: publisher.url };
  const a = publisher.address || {};
  if (a.addressLocality || a.streetAddress) {
    org.address = { '@type': 'PostalAddress', addressCountry: a.addressCountry || 'MA' };
    if (a.addressLocality) org.address.addressLocality = a.addressLocality;
    if (a.streetAddress) org.address.streetAddress = a.streetAddress;
  }
  if (publisher.logo) org.logo = publisher.logo;
  if (publisher.telephone) org.telephone = publisher.telephone;
  if (publisher.sameAs?.length) org.sameAs = publisher.sameAs;
  return org;
}

const ARTICLE_PAGE_TYPES = new Set(['pillar', 'guide', 'explainer', 'checklist', 'local', 'data', 'news']);

// d: { site, page?, kind: 'home'|'content'|'collection'|'notfound', title, description, url, lang, crumbs, author? }
export function buildJsonLd(project, d) {
  const domain = d.site.domain;
  const abs = u => `https://${domain}${u}`;
  const orgRef = { '@id': project.publisher['@id'] };
  const siteId = `https://${domain}/#website`;
  const graph = [organizationNode(project.publisher)];
  if (d.kind === 'home') {
    graph.push({
      '@type': 'WebSite', '@id': siteId, url: `https://${domain}/`, name: d.site.meta.name,
      alternateName: `${d.site.meta.name} par Wiki Tours`,
      inLanguage: d.site.meta.languages.map(l => `${l}-MA`), publisher: orgRef,
    });
  }
  if (d.crumbs?.length) {
    graph.push({
      '@type': 'BreadcrumbList', '@id': abs(d.url) + '#breadcrumb',
      itemListElement: d.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.url) })),
    });
  }
  const p = d.page;
  const fm = p?.fm || {};
  const base = { '@id': abs(d.url) + '#main', url: abs(d.url), inLanguage: `${d.lang}-MA`, isPartOf: { '@id': siteId }, publisher: orgRef };
  if (p && (p.kind === 'posts' || ARTICLE_PAGE_TYPES.has(fm.type))) {
    graph.push({
      '@type': p.kind === 'posts' ? 'BlogPosting' : 'Article', ...base,
      headline: d.title, description: d.description,
      datePublished: fm.date, dateModified: fm.updated || fm.date,
      mainEntityOfPage: abs(d.url), author: d.author || orgRef,
    });
  } else {
    graph.push({ '@type': d.kind === 'collection' ? 'CollectionPage' : 'WebPage', ...base, name: d.title, description: d.description });
  }
  if (fm.faq?.length) {
    graph.push({
      '@type': 'FAQPage', '@id': abs(d.url) + '#faq',
      mainEntity: fm.faq.map(f => ({ '@type': 'Question', name: stripMarkers(f.q),
        acceptedAnswer: { '@type': 'Answer', text: plainText(renderInline(stripMarkers(f.a))) } })),
    });
  }
  if (fm.type === 'data' && d.site.meta.dataset) {
    graph.push({
      '@type': 'Dataset', '@id': abs(d.url) + '#dataset', name: d.title, description: d.description,
      url: abs(d.url), creator: orgRef, dateModified: fm.updated || fm.date, isAccessibleForFree: true,
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export const jsonLdScript = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
