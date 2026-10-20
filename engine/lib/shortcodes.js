// Resolves body shortcodes into inline HTML before Markdown rendering.
//   [[fact:fact_id]]              citation marker -> superscript link to the numbered source
//   [[link:slug|anchor]]          same-site link (page or post slug; "blog" = blog index)
//   [[site:domain/slug|anchor]]   sister-site link (only along config/network.json flows)
//   [[wt:target_id|anchor]]       link to wikitours.ma (rel from config/link-policy.json)
//   [[kb:entry_id]]               an approved religious text from data/facts/kb/ (exact text + reference, gate 4)
// The HTML is returned as placeholders (see markdown.js restoreSnippets) so raw HTML can stay off in Markdown.
import { esc, stripMarkers } from './util.js';
import { langPrefix, group } from './content.js';
import { NOGATE } from './markdown.js';

export const SHORTCODE = /\[\[(fact|link|site|wt|kb):([^\]|]+?)(?:\|([^\]]*))?\]\]/g;
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
    const hasPosts = group(ctx, site, lang).some(p => p.kind === 'posts');
    return hasPosts ? { url: `${langPrefix(ctx.project, lang)}/blog/`, title: null } : null;
  }
  return ctx.index.get(`${site}|${lang}|${slug}`) || (lang !== base ? ctx.index.get(`${site}|${base}|${slug}`) : null) || null;
}

// Same-site or sister target that exists but is retired (RUNBOOK §4): the link becomes plain text with a warning.
const isRetired = (ctx, site, lang, slug) => !!ctx.retired?.has(`${site}|${lang}|${slug}`);

// Returns { text, snippets, links, errors, warnings }. `factNum` maps fact id -> source number.
// `text` holds placeholders; pass `snippets` to renderMarkdown / renderInline (env.snippets) or restoreSnippets.
export function resolveShortcodes(text, page, ctx, factNum) {
  const links = [], errors = [], warnings = [], snippets = [];
  const policy = ctx.project.linkPolicy;
  const html = s => `\uE000${snippets.push(s) - 1}\uE001`;
  const out = String(text ?? '').replace(SHORTCODE, (whole, kind, ref, anchor) => {
    ref = ref.trim(); anchor = anchor?.trim();
    return html(resolveOne(kind, ref, anchor));
  });
  return { text: out, snippets, links, errors, warnings };

  function resolveOne(kind, ref, anchor) {
    if (kind === 'fact') {
      const n = factNum.get(ref);
      if (!ctx.project.registry[ref]) errors.push(`unknown fact in citation: ${ref}`);
      return `<sup class="cite" data-fact="${esc(ref)}"><a href="#src-${n ?? 0}">${n ?? '?'}</a></sup>`;
    }
    if (kind === 'link') {
      const t = resolveSlug(ctx, page.site, page.lang, ref);
      if (!t && isRetired(ctx, page.site, page.lang, ref)) { warnings.push(`[[link:${ref}]] points to a retired page: shown as plain text, remove the link`); return esc(anchor || ref); }
      if (!t) { errors.push(`unresolved same-site link [[link:${ref}]]`); return esc(anchor || ref); }
      const label = anchor || stripMarkers(t.fm?.title) || ref;
      links.push({ kind: 'same', href: t.url, anchor: label, target: t });
      return `<a href="${esc(t.url)}">${esc(label)}</a>`;
    }
    if (kind === 'site') {
      const [domain, ...rest] = ref.split('/');
      const slug = rest.join('/');
      if (!ctx.project.sites.has(domain)) { errors.push(`unknown sister site in [[site:${ref}]]`); return esc(anchor || ref); }
      if (domain === page.site) { errors.push(`[[site:${ref}]] points to this site: use [[link:${slug}]]`); return esc(anchor || ref); }
      const t = resolveSlug(ctx, domain, page.lang, slug);
      if (!t && isRetired(ctx, domain, page.lang, slug)) { warnings.push(`[[site:${ref}]] points to a retired page: shown as plain text, remove the link`); return esc(anchor || ref); }
      if (!t) { errors.push(`unresolved sister link [[site:${ref}]]`); return esc(anchor || ref); }
      const href = `https://${domain}${t.url}`;
      const label = anchor || stripMarkers(t.fm?.title) || ref;
      links.push({ kind: 'sister', href, anchor: label, domain, target: t });
      const rel = policy.sister_rel && policy.sister_rel !== 'follow' ? ` rel="${esc(policy.sister_rel)}"` : '';
      return `<a href="${esc(href)}"${rel}>${esc(label)}</a>`;
    }
    if (kind === 'kb') return kbHtml(ctx, page, ref, errors);
    // wt
    const t = ctx.project.wtTargets[ref];
    if (!t) { errors.push(`unknown wikitours target [[wt:${ref}]] (see config/wikitours-targets.json)`); return esc(anchor || ref); }
    const label = anchor || t.label;
    links.push({ kind: 'wt', href: t.url, anchor: label, target: t });
    const note = t.lang !== page.lang ? (policy.money_link_lang_note?.[page.lang] || '') : '';
    return `<a href="${esc(t.url)}" rel="${esc(policy.money_link_rel || 'nofollow')}" class="wt-link">${esc(label)}</a>${note ? `<span class="lang-note">${esc(note)}</span>` : ''}`;
  }
}

// An approved KB entry: the exact text, its translation for the page language (if approved) and its reference.
// Wrapped in NOGATE: the facts and religious-text gates do not read it (its reference carries digits).
function kbHtml(ctx, page, id, errors) {
  const e = ctx.project.kb?.[id];
  if (!e || e.status !== 'approved') { errors.push(`[[kb:${id}]] is not an approved entry of data/facts/kb/`); return ''; }
  const tr = e.lang !== page.lang ? e.translations?.[page.lang] : null;
  return NOGATE(`<q class="kb__text" lang="${esc(e.lang)}"${e.lang === 'ar' ? ' dir="rtl"' : ''}>${esc(e.text)}</q>`
    + (tr ? ` <span class="kb__translation">(${esc(tr)})</span>` : '') + ` <cite class="kb__ref">${esc(e.reference)}</cite>`);
}
