// Facts gate — ported verbatim from STRATEGY 10.4 (tested: gender/plural/Arabic-prefix regressions).
// Blocks publishing when a sentence has a digit or a rule word but cites no approved fact,
// when a cited fact is unknown / not approved / past review_by / expired,
// or when a number in a sentence is not a value of the fact(s) it cites.
import { todayISO } from './util.js';

const MARK = /\[\[fact:([a-z0-9_]+)\]\]/g;
const NUM = /[0-9٠-٩]+(?:[ .,\u202F][0-9]{3})*(?:[.,][0-9]+)?/g;
// Unicode-aware stems: JS \b is ASCII-only, so "garantie", "interdite", "requise" used to slip through.
// "visa" also matches "visage": an accepted false positive (it only sends a sentence to review).
const CLAIM_WORDS = /(?<!\p{L})(obligatoir|interdi|exig|requi[st]|requier|gratuit|garanti|rembours|quota|visa|vaccin|d[ée]lai|date limite)\p{L}*|(?<!\p{L})(?:[وفبل]?ال)?(واجب|ممنوع|إلزامي|الزامي|مجاني|تأشير|مضمون|مسترجع)\p{L}*/iu;
// Engine addition (DECISIONS D-H): English rule words, checked on every page like the French and Arabic ones
// (quota, visa and vaccin* are already shared stems above).
const CLAIM_WORDS_EN = /(?<!\p{L})(mandator|requir|forbid|prohibit|free of charge|guarante|refund|deadline)\p{L}*/iu;
export const hasRuleWord = s => CLAIM_WORDS.test(s) || CLAIM_WORDS_EN.test(s);
const AR_DIGITS = s => s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
export const norm = s => AR_DIGITS(String(s)).replace(/[ .,\u202F](?=\d{3}\b)/g, '').replace(',', '.');
export const splitSentences = t => t.replace(/\n+/g, ' ').split(/(?<=[.!?؟])\s+/).map(s => s.trim()).filter(Boolean);

export function factsGate(text, registry, { today = todayISO(), approvedPhrases = [] } = {}) {
  const errors = [];
  for (const sentence of splitSentences(text)) {
    const ids = [...sentence.matchAll(MARK)].map(m => m[1]);
    let bare = sentence.replace(MARK, '');
    for (const p of approvedPhrases) bare = bare.split(p).join('');   // e.g. "les 10 dernières nuits"
    const nums = (bare.match(NUM) || []).map(norm);
    if (!ids.length) {
      if (nums.length) errors.push({ rule: 'digits-without-fact', sentence: bare });
      else if (hasRuleWord(bare)) errors.push({ rule: 'rule-word-without-fact', sentence: bare });
      continue;
    }
    const allowed = new Set();
    for (const id of ids) {
      const f = registry[id];
      if (!f) { errors.push({ rule: 'unknown-fact', id }); continue; }
      if (f.status !== 'approved') errors.push({ rule: 'fact-not-approved', id, status: f.status });
      if (f.review_by && f.review_by < today) errors.push({ rule: 'fact-past-review', id });
      if (f.valid_until && f.valid_until < today) errors.push({ rule: 'fact-expired', id });
      for (const v of f.values ?? []) allowed.add(norm(v));
    }
    for (const n of nums) if (!allowed.has(n)) errors.push({ rule: 'number-not-in-fact', value: n, ids });
  }
  return { ok: errors.length === 0, errors };
}

// Engine addition (registry rule 2): a likely/estimate fact must appear with its required_wording
// in the same sentence, in the page language (required_wording = French, required_wording_ar / _en otherwise).
// A fact whose wording has no translation for the page language cannot be cited there (wording: null).
// Comparison ignores case and apostrophe style.
const loose = s => String(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');
export const wordingFor = (f, lang = 'fr') => (lang === 'fr' ? f.required_wording : f[`required_wording_${lang}`]) || null;
export function requiredWordingGate(text, registry, lang = 'fr') {
  const errors = [];
  for (const sentence of splitSentences(text)) {
    for (const [, id] of sentence.matchAll(MARK)) {
      const f = registry[id];
      if (!f?.required_wording) continue;
      const wording = wordingFor(f, lang);
      if (!wording || !loose(sentence).includes(loose(wording)))
        errors.push({ rule: 'required-wording-missing', id, wording, sentence: sentence.replace(MARK, '') });
    }
  }
  return errors;
}
