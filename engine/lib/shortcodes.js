// Resolves body shortcodes into inline HTML before Markdown rendering.
//   [[fact:fact_id]]              citation marker -> superscript link to the numbered source
//   [[link:slug|anchor]]          same-site link (page or post slug; "blog" = blog index)
//   [[site:domain/slug|anchor]]   sister-site link (only along config/network.json flows)
//   [[wt:target_id|anchor]]       link to wikitours.ma (rel from config/link-policy.json)
import { esc } from './util.js';
import { langPrefix } from './content.js';

export const SHORTCODE = /\[\[(fact|link|site|wt):([^\]|]+?)(?:\|([^\]]*))?\]\]/g;
const FACT_MARK = /\[\[fact:([a-z0-9_]+)\]\]/g;

export function factIdsIn(text) { return [...String(text ?? '').matchAll(FACT_MARK)].map(m => m[1]); }

// Numbered source list: front-matter sources first, then the sources of cited facts.
export function buildSources(page, project) {
  const sources = [], byUrl = new Map(), factNum = new Map();
  const add = s => {
    if (byUrl.has(s.url)) return byUrl.get(s.url);
    sources.push({ ...s, n: sources.length + 1 }); byUrl.set(s.url, sources.length); return sources.length;
  };
  for (const s of page.fm.sources || []) add(s);
  const ids = [...new Set([...factIdsIn(page.body), ...(page.fm.faq || []).flatMap(f => factIdsIn(f.a))])];
  for (const id of ids) {
    const f = project.registry[id];
    if (!f) continue;
    let first = null;
    for (const url of f.source_urls) {
      const n = add({ title: null, publisher: hostOf(url), url, accessed: f.verified_at || null, fact: id });
      first ??= n;
    }
    factNum.set(id, first);
  }
  return { sources, factNum };
}

const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

// Resolve a same-site or sister slug to a page of the given site.
export function resolveSlug(ctx, site, lang, slug) {
  const base = ctx.project.network.base_lang || 'fr';
  if (slug === 'blog') {
    const hasPosts = ctx.pages.some(p => p.site === site && p.lang === lang && p.kind === 'posts');
    return hasPosts ? { url: `${langPrefix(ctx.project, lang)}/blog/`, title: null } : null;
  }
  return ctx.index.get(`${site}|${lang}|${slug}`) || (lang !== base ? ctx.index.get(`${site}|${base}|${slug}`) : null) || null;
}

// Returns { text, links, errors }. `factNum` maps fact id -> source number.
export function resolveShortcodes(text, page, ctx, factNum) {
  const links = [], errors = [];
  const policy = ctx.project.linkPolicy;
  const out = String(text ?? '').replace(SHORTCODE, (whole, kind, ref, anchor) => {
    ref = ref.trim(); anchor = anchor?.trim();
    if (kind === 'fact') {
      const n = factNum.get(ref);
      if (!ctx.project.registry[ref]) errors.push(`unknown fact in citation: ${ref}`);
      return `<sup class="cite" data-fact="${esc(ref)}"><a href="#src-${n ?? 0}">${n ?? '?'}</a></sup>`;
    }
    if (kind === 'link') {
      const t = resolveSlug(ctx, page.site, page.lang, ref);
      if (!t) { errors.push(`unresolved same-site link [[link:${ref}]]`); return esc(anchor || ref); }
      const label = anchor || t.fm?.title || ref;
      links.push({ kind: 'same', href: t.url, anchor: label, target: t });
      return `<a href="${esc(t.url)}">${esc(label)}</a>`;
    }
    if (kind === 'site') {
      const [domain, ...rest] = ref.split('/');
      const slug = rest.join('/');
      if (!ctx.project.sites.has(domain)) { errors.push(`unknown sister site in [[site:${ref}]]`); return esc(anchor || ref); }
      if (domain === page.site) { errors.push(`[[site:${ref}]] points to this site: use [[link:${slug}]]`); return esc(anchor || ref); }
      const t = resolveSlug(ctx, domain, page.lang, slug);
      if (!t) { errors.push(`unresolved sister link [[site:${ref}]]`); return esc(anchor || ref); }
      const href = `https://${domain}${t.url}`;
      const label = anchor || t.fm?.title || ref;
      links.push({ kind: 'sister', href, anchor: label, domain, target: t });
      const rel = policy.sister_rel && policy.sister_rel !== 'follow' ? ` rel="${esc(policy.sister_rel)}"` : '';
      return `<a href="${esc(href)}"${rel}>${esc(label)}</a>`;
    }
    // wt
    const t = ctx.project.wtTargets[ref];
    if (!t) { errors.push(`unknown wikitours target [[wt:${ref}]] (see config/wikitours-targets.json)`); return esc(anchor || ref); }
    const label = anchor || t.label;
    links.push({ kind: 'wt', href: t.url, anchor: label, target: t });
    const note = t.lang !== page.lang ? (policy.money_link_lang_note?.[page.lang] || '') : '';
    return `<a href="${esc(t.url)}" rel="${esc(policy.money_link_rel || 'nofollow')}" class="wt-link">${esc(label)}</a>${note ? `<span class="lang-note">${esc(note)}</span>` : ''}`;
  });
  return { text: out, links, errors };
}
