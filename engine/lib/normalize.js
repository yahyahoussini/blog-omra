// Keyword / text normalisation for FR + AR (ported from the tested prototype).
const AR_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g; // tashkeel, Quranic marks
const TATWEEL = /ـ/g;

export function normalizeArabic(s) {
  return s
    .replace(AR_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه'); // matching key only, never for display
}

// Spelling variants that mean the same thing. Extend from real data, never guess.
const SYNONYMS = new Map([
  ['oumra', 'omra'], ['umra', 'omra'], ['umrah', 'omra'], ['omrah', 'omra'], ['3omra', 'omra'],
  ['hadj', 'hajj'], ['haj', 'hajj'], ['hadjj', 'hajj'],
  ['عمره', 'omra'], ['حج', 'hajj'],
  ['casa', 'casablanca'],
]);

export function normalizeKeyword(raw) {
  let s = String(raw).normalize('NFKC').toLowerCase().trim();
  s = normalizeArabic(s);
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); // strip Latin accents (é -> e)
  s = s.replace(/[’'`´]/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').map(t => SYNONYMS.get(t) ?? t).join(' ');
}

// Canonical "match key": drop years and stop-words so "omra ramadan 2027" == "omra du ramadan 2026".
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'en', 'au', 'aux', 'a', 'pour', 'et', 'l', 'd', 'un', 'une', 'que', 'qui', 'quoi', 'comment', 'في', 'من', 'الى', 'إلى', 'على']);
export function matchKey(raw) {
  return normalizeKeyword(raw)
    .split(' ')
    .filter(t => t && !STOP.has(t) && !/^(19|20)\d\d$/.test(t) && !/^14\d\d$/.test(t))
    .sort()
    .join(' ');
}

export function detectLang(raw) {
  const s = String(raw);
  if (/[؀-ۿ]/.test(s)) return 'ar';
  if (/\b(umrah|price|package|from|trip|cheap)\b/i.test(s)) return 'en';
  return 'fr';
}
