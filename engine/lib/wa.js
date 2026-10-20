// WhatsApp click-to-chat links with reference codes (STRATEGY 11.2).
// Ref code = site ref + 4-digit page id, placed at the START of the message so it survives edits.
import { fnv32 } from './util.js';

const MSG = {
  fr: (ref, site, topic, who) => `[${ref}] Bonjour Wiki Tours, je viens de ${site}. ${topic}${who ? ' – ' + who : ''}. Nombre de personnes : __`,
  ar: (ref, site, topic, who) => `[${ref}] السلام عليكم Wiki Tours، جئت من ${site}. ${topic}${who ? ' – ' + who : ''}. عدد الأشخاص: __`,
};

export function normalizeNumber(number) {
  const digits = String(number ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (!/^212\d{9}$/.test(digits)) throw new Error(`Moroccan number in international format expected (212XXXXXXXXX), got "${number}"`);
  return digits;
}

export const refCode = (siteRef, pageId) => `${siteRef}-${String(pageId).padStart(4, '0')}`;

// Returns { ref, href, message }. Wave 1: plain wa.me link (rel="nofollow" in the page).
export function waLink({ number, site, siteRef, pageId, lang = 'fr', topic, who = '' }) {
  const digits = normalizeNumber(number);
  const ref = refCode(siteRef, pageId);
  const message = (MSG[lang] || MSG.fr)(ref, site, topic, who);
  return { ref, message, href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}` };
}

// Stable 4-digit id from the slug (1..9999).
export const pageIdFromSlug = (slug, lang = 'fr') => (fnv32(`${lang}/${slug}`) % 9999) + 1;

// Assign ids to all pages of one site. An explicit front-matter page_id wins; hash collisions
// are resolved by linear probing in (date, slug) order so older pages keep their id.
export function assignPageIds(pages) {
  const used = new Map();
  for (const p of pages) if (p.fm.page_id) {
    if (used.has(p.fm.page_id)) throw new Error(`page_id ${p.fm.page_id} used twice (${used.get(p.fm.page_id)} and ${p.file})`);
    used.set(p.fm.page_id, p.file); p.pageId = p.fm.page_id;
  }
  const rest = pages.filter(p => !p.fm.page_id)
    .sort((a, b) => String(a.fm.date).localeCompare(String(b.fm.date)) || `${a.lang}/${a.fm.slug}`.localeCompare(`${b.lang}/${b.fm.slug}`));
  for (const p of rest) {
    let id = pageIdFromSlug(p.fm.slug, p.lang);
    while (used.has(id)) id = (id % 9999) + 1;
    used.set(id, p.file); p.pageId = id;
  }
}
