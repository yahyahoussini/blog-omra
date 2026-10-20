// Facts gate cases (ported idea of the 19 tested prototype cases, plus required wording).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factsGate, requiredWordingGate, splitSentences, norm } from '../engine/lib/facts-gate.js';

const T = '2026-10-20';
const base = { status: 'approved', review_by: '2026-11-19', valid_until: null };
const R = {
  fact_visa: { ...base, values: ['9', '2027', '1448'] },
  fact_cost: { ...base, values: ['63021', '65000'] },
  fact_amount: { ...base, values: ['3.8', '380'] },
  fact_window: { ...base, values: ['30'], required_wording: 'selon Gulf News' },
  fact_proposed: { ...base, status: 'proposed', values: ['25012'] },
  fact_old: { ...base, review_by: '2026-01-01', values: ['12'] },
  fact_expired: { ...base, valid_until: '2026-03-01', values: ['7'] },
  fact_quote: { ...base, values: ['2016'], required_wording: "selon le site de l'agence" },
};
const rules = (text, opts = {}) => factsGate(text, R, { today: T, ...opts }).errors.map(e => e.rule);

test('1. digits without a fact are blocked', () => assert.deepEqual(rules('Le dernier visa est délivré le 9 mars 2027.'), ['digits-without-fact']));
test('2. Arabic-Indic digits without a fact are blocked', () => assert.deepEqual(rules('آخر أجل هو ٩ مارس ٢٠٢٧.'), ['digits-without-fact']));
test('3. a rule word without a fact is blocked', () => assert.deepEqual(rules('Le vaccin est obligatoire pour tous.'), ['rule-word-without-fact']));
test('4. gender and plural forms of rule words are caught', () => {
  for (const s of ['La viande est interdite.', 'Une photo est requise.', 'Les visites sont gratuites.', 'Des places garanties.', 'Les frais sont remboursés.'])
    assert.deepEqual(rules(s), ['rule-word-without-fact'], s);
});
test('5. Arabic rule words with the al- prefix are caught', () => {
  for (const s of ['التأشيرة ضرورية.', 'هذا الأمر الواجب على الحاج.', 'السعر مضمون.']) assert.deepEqual(rules(s), ['rule-word-without-fact'], s);
});
test('6. "visage" is an accepted false positive (it only sends the sentence to review)', () => assert.deepEqual(rules('Le visage du pèlerin.'), ['rule-word-without-fact']));
test('7. a cited sentence whose numbers are values of the fact passes', () => assert.deepEqual(rules('Le dernier visa est délivré le 9 mars 2027 [[fact:fact_visa]].'), []));
test('8. a number that is not a value of the cited fact is blocked', () => assert.deepEqual(rules('Le dernier visa est délivré le 10 mars 2027 [[fact:fact_visa]].'), ['number-not-in-fact']));
test('9. thousands separators normalise (space, dot, comma, narrow no-break space)', () => {
  for (const n of ['63 021', '63.021', '63,021', '63 021']) assert.deepEqual(rules(`Le coût final est de ${n} dirhams [[fact:fact_cost]].`), [], n);
});
test('10. decimals with a comma normalise to a dot', () => assert.deepEqual(rules('Environ 3,8 millions de dirhams, soit 380 millions de centimes [[fact:fact_amount]].'), []));
test('11. an unknown fact id is blocked', () => assert.ok(rules('Le chiffre est 9 [[fact:fact_nope]].').includes('unknown-fact')));
test('12. a proposed (not approved) fact is blocked', () => assert.deepEqual(rules('Licence ODV-25012 [[fact:fact_proposed]].'), ['fact-not-approved']));
test('13. a fact past review_by is blocked', () => assert.deepEqual(rules('Il y avait 12 cas [[fact:fact_old]].'), ['fact-past-review']));
test('14. a fact past valid_until is blocked', () => assert.deepEqual(rules('Le départ a lieu le 7 [[fact:fact_expired]].'), ['fact-expired']));
test('15. approved phrases are removed before the digit check', () => {
  assert.deepEqual(rules('Prier pendant les 10 dernières nuits.', { approvedPhrases: ['les 10 dernières nuits'] }), []);
  assert.deepEqual(rules('Prier pendant les 10 dernières nuits.'), ['digits-without-fact']);
});
test('16. only the uncited sentence of a paragraph is flagged', () => {
  const e = factsGate('Le dernier visa est le 9 mars 2027 [[fact:fact_visa]]. Il reste 3 places.', R, { today: T }).errors;
  assert.equal(e.length, 1); assert.equal(e[0].rule, 'digits-without-fact'); assert.match(e[0].sentence, /3 places/);
});
test('17. two markers in one sentence combine their allowed values', () => assert.deepEqual(rules('Le 9 mars 2027 [[fact:fact_visa]], le visa expire après 30 jours [[fact:fact_window]].'), []));
test('18. Arabic-Indic digits match Latin fact values', () => assert.deepEqual(rules('آخر تأشيرة في ٩ مارس ٢٠٢٧ [[fact:fact_visa]].'), []));
test('19. sentences split on ?, ! and the Arabic question mark', () => {
  assert.deepEqual(splitSentences('Quand ? Le 9 mars. Vraiment ! Oui؟ نعم'), ['Quand ?', 'Le 9 mars.', 'Vraiment !', 'Oui؟', 'نعم']);
  assert.equal(norm('٢٠٢٧'), '2027');
});
test('20. required wording must sit in the cited sentence (case and apostrophes ignored)', () => {
  assert.equal(requiredWordingGate('Le visa doit servir dans les 30 jours [[fact:fact_window]].', R).length, 1);
  assert.equal(requiredWordingGate('Selon Gulf News, le visa doit servir dans les 30 jours [[fact:fact_window]].', R).length, 0);
  assert.equal(requiredWordingGate('Depuis 2016, selon le site de l’agence [[fact:fact_quote]].', R).length, 0);
});
