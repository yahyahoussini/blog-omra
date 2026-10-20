// Languages of the network (DECISIONS D-H): French at the root, Arabic under /ar/ (RTL), English under /en/.
// One table for every place the engine writes a language code, a direction or a formatted date / number.
export const LANGS = {
  fr: { html: 'fr-MA', hreflang: 'fr-MA', og: 'fr_MA', intl: 'fr-MA', dir: 'ltr', name: 'Français', short: 'FR' },
  ar: { html: 'ar-MA', hreflang: 'ar-MA', og: 'ar_MA', intl: 'ar-MA', dir: 'rtl', name: 'العربية', short: 'العربية' },
  en: { html: 'en', hreflang: 'en', og: 'en_GB', intl: 'en-GB', dir: 'ltr', name: 'English', short: 'EN' },
};
export const LANG_CODES = Object.keys(LANGS);
export const langInfo = lang => LANGS[lang] || LANGS.fr;
export const TIME_ZONE = 'Africa/Casablanca';

const cache = new Map(); // one Intl formatter per locale and options (creating one per call is slow on big builds)
const formatter = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
// Noon UTC is the same calendar day in Casablanca (UTC+0/+1), so a YYYY-MM-DD never shifts.
const noon = ymd => new Date(ymd + 'T12:00:00Z');

// « 20 octobre 2026 » · « 20 أكتوبر 2026 » (Western digits with ar-MA) · « 20 October 2026 ».
export function formatDate(ymd, lang = 'fr') {
  if (!ymd) return '';
  const locale = langInfo(lang).intl;
  return formatter(`d|${locale}`, () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE })).format(noon(ymd));
}

// Umm al-Qura Hijri date. Always shown with the « approximate » label (hijriApprox): the Moroccan calendar follows
// the local moon sighting and can differ by a day.
export function formatHijri(ymd, lang = 'fr') {
  if (!ymd) return '';
  const locale = `${langInfo(lang).intl}-u-ca-islamic-umalqura`;
  try {
    return formatter(`h|${locale}`, () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE })).format(noon(ymd));
  } catch { return ''; }
}

export function formatNumber(n, lang = 'fr') {
  const locale = langInfo(lang).intl;
  return formatter(`n|${locale}`, () => new Intl.NumberFormat(locale)).format(n);
}

// User-perceived characters: an Arabic letter with its vowel marks counts once (meta length rules).
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export const graphemes = s => { let n = 0; for (const _ of segmenter.segment(String(s ?? ''))) n++; return n; };
