// Markdown rendering with the content containers and the automatic disclosure box.
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import { esc } from './util.js';

export const MENTION = /wiki\s?tours|bab\s?makka/i;
// Template text wrapped in these comments is ignored by the facts / duplicate gates.
export const NOGATE = (html) => `<!--nogate-->${html}<!--/nogate-->`;

const md = new MarkdownIt({ html: true, linkify: false, typographer: false });

// Container name -> { tag, label key, title as heading? }
const BOXES = {
  answer: { tag: 'aside', heading: false },
  retenir: { tag: 'aside', heading: false },
  unknown: { tag: 'section', heading: true },
  disclosure: { tag: 'aside', heading: false },
  steps: { tag: 'div', heading: false },
  warning: { tag: 'aside', heading: false },
};

for (const [name, box] of Object.entries(BOXES)) {
  md.use(container, name, {
    render(tokens, idx, _opts, env) {
      if (tokens[idx].nesting !== 1) return `</${box.tag}>\n`;
      const label = esc(env.labels?.[name] ?? name);
      const title = box.heading ? `<h2 class="box__title">${label}</h2>` : `<p class="box__label">${label}</p>`;
      // An empty :::disclosure gets the site's default wording.
      const empty = name === 'disclosure' && tokens[idx + 1]?.type === `container_${name}_close`;
      const body = empty ? `<p>${esc(env.labels?.disclosureText ?? '')}</p>` : '';
      return `<${box.tag} class="box box--${name}">${NOGATE(title + body)}\n`;
    },
  });
}

// :::cta [topic] — inner text (optional) followed by the WhatsApp button for this page.
md.use(container, 'cta', {
  render(tokens, idx, _opts, env) {
    env._cta ??= [];
    if (tokens[idx].nesting === 1) {
      env._cta.push(tokens[idx].info.trim().replace(/^cta\s*/, ''));
      return '<div class="cta-inline">\n';
    }
    const topic = env._cta.pop();
    env.inlineCta = true;
    return `${env.renderCta ? NOGATE(env.renderCta(topic || null)) : ''}</div>\n`;
  },
});

// Tables scroll inside their own box on small screens instead of the page.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

// Render a body. env: { labels, disclosureHtml, forceDisclosure, renderCta }.
// Returns { html, disclosed, hasUnknown, images: [{alt, src}] }.
export function renderMarkdown(src, env) {
  const tokens = md.parse(src, env);
  const has = type => tokens.some(t => t.type === type);
  let disclosed = has('container_disclosure_open');
  if (!disclosed && env.disclosureHtml) {
    let at = -1;
    const i = tokens.findIndex(t => t.type === 'inline' && MENTION.test(t.content));
    if (i >= 0) { at = i; while (at > 0 && !(tokens[at].level === 0 && tokens[at].nesting !== -1)) at--; }
    else if (env.forceDisclosure) at = 0;
    if (at >= 0 && tokens.length) {
      const Token = tokens[0].constructor;
      const box = new Token('html_block', '', 0);
      box.content = env.disclosureHtml + '\n';
      tokens.splice(at, 0, box);
      disclosed = true;
    }
  }
  let html = md.renderer.render(tokens, md.options, env);
  if (!tokens.length && env.forceDisclosure && env.disclosureHtml) { html = env.disclosureHtml + html; disclosed = true; }
  const images = [];
  for (const t of tokens) for (const c of t.children || []) if (c.type === 'image') images.push({ alt: c.content, src: c.attrGet('src') });
  return { html, disclosed, hasUnknown: has('container_unknown_open'), images };
}

export const renderInline = (src, env = {}) => md.renderInline(String(src ?? ''), env);

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

// Text the gates read: template parts removed, citation superscripts turned back into [[fact:id]],
// one sentence boundary per table row and list item.
export function gateText(html) {
  return String(html)
    .replace(/<!--nogate-->[\s\S]*?<!--\/nogate-->/g, ' ')
    .replace(/<sup class="cite" data-fact="([a-z0-9_]+)">[\s\S]*?<\/sup>/g, ' [[fact:$1]]')
    .replace(/<\/(tr|li|dt|dd)>/g, '. \n')
    .replace(/<\/(p|h[1-6]|td|th|blockquote|div|aside|section|table|thead|tbody)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m])
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export const plainText = html => gateText(html).replace(/\s*\[\[fact:[a-z0-9_]+\]\]/g, '');
