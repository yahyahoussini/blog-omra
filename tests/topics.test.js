// Topic selection (generator) and network dedupe (planner) on the fixture network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadProject } from '../engine/lib/config.js';
import { loadContent } from '../engine/lib/content.js';
import { selectTopics, networkItems, topicConflicts, activeLanguages, postCounts, factState, slugify, topicSlug } from '../scripts/lib/topics.js';
import { languageSlots } from '../scripts/lib/cadence.js';
import { acceptProposals } from '../scripts/lib/planner.js';
import { isoWeek } from '../scripts/lib/common.js';
import { tmpNetwork, cleanup, alphaTopic, baseCadence, TODAY } from './lib/tmp-network.js';

after(cleanup);
const root = tmpNetwork();
const project = await loadProject(root);
const content = loadContent(project);
const items = networkItems(content);
const pick = (topics, extra = {}) => selectTopics({
  topics, site: 'alpha.test', project, items, today: TODAY, minFactDays: 0, quota: 3,
  langSlots: () => 3, activeLangs: activeLanguages(content, 'alpha.test'), ...extra,
});
const t = (id, extra) => alphaTopic({ id, slug: `sujet-${id}`, primary_keyword: `sujet ${id} test`, concept_id: `c_${id.replace(/-/g, '_')}`, title: `Sujet ${id} : une démonstration bien distincte`, ...extra });

test('facts must be approved and valid long enough; unknown facts never pass', () => {
  assert.equal(factState(project.registry.fact_test_last_visa, TODAY), 'ok');
  assert.match(factState(project.registry.fact_test_old, TODAY), /past review_by/);
  assert.match(factState(project.registry.fact_wikitours_licence, TODAY), /not approved/);
  assert.equal(factState(undefined, TODAY), 'unknown');
  assert.match(factState(project.registry.fact_test_last_visa, TODAY, 40), /review_by 2026-11-19 within 40 days/);
  const { selected, skipped } = pick([
    t('a1', { facts_needed: ['fact_test_old'] }),
    t('a2', { facts_needed: ['fact_wikitours_licence'] }),
    t('a3', { facts_needed: ['fact_nope'] }),
    t('a4', { facts_needed: [] }),
    t('a5'),
  ]);
  assert.deepEqual(selected.map(x => x.id), ['a5']);
  assert.match(skipped.find(s => s.id === 'a1').reason, /fact_test_old past review_by/);
  assert.match(skipped.find(s => s.id === 'a2').reason, /not approved/);
  assert.match(skipped.find(s => s.id === 'a3').reason, /fact_nope unknown/);
  assert.match(skipped.find(s => s.id === 'a4').reason, /no facts_needed/);
  const late = pick([t('a6')], { minFactDays: 40 });
  assert.equal(late.selected.length, 0);
});

test('only queued topics, in file order, up to the quota and the language slot', () => {
  const topics = [t('b1', { status: 'done' }), t('b2', { status: 'failed' }), t('b3', { status: 'blocked' }), t('b4'), t('b5'), t('b6')];
  assert.deepEqual(pick(topics, { quota: 2 }).selected.map(x => x.id), ['b4', 'b5']);
  const oneFr = pick(topics, { langSlots: languageSlots(baseCadence(), {}) });
  assert.deepEqual(oneFr.selected.map(x => x.id), ['b4'], 'D-H: one French post per day');
  assert.match(oneFr.skipped.find(s => s.id === 'b5').reason, /daily fr slot/);
  assert.equal(pick(topics, { langSlots: languageSlots(baseCadence(), { fr: 1 }) }).selected.length, 0);
});

test('a language without a published home page, a page type or missing fields wait', () => {
  const { selected, skipped } = pick([t('c1', { lang: 'ar' }), t('c2', { type: 'pillar' }), t('c3', { cluster: '' })]);
  assert.equal(selected.length, 0);
  assert.match(skipped[0].reason, /no published ar home page/);
  assert.match(skipped[1].reason, /not a generated post type/);
  assert.match(skipped[2].reason, /missing fields: cluster/);
});

test('conflicts with published content block the topic (keyword, concept, cluster, title, slug)', () => {
  const { selected, skipped } = pick([
    t('d1', { primary_keyword: 'Fenêtre d’utilisation test 2027' }),             // same match key as premier-article
    t('d2', { concept_id: 'test_window' }),                                       // concept already served in fr
    t('d3', { concept_id: 'test_read_average' }),                                 // concept owned by beta.test
    t('d4', { cluster: 'beta_prices' }),                                          // cluster of beta.test
    t('d5', { title: "Premier article : la fenêtre d'utilisation expliquée" }),   // same title
    t('d6', { slug: 'premier-article' }),                                         // slug taken
  ]);
  assert.equal(selected.length, 0);
  const why = Object.fromEntries(skipped.map(s => [s.id, s.reason]));
  assert.match(why.d1, /same primary keyword/);
  assert.match(why.d2, /already served in fr/);
  assert.match(why.d3, /owned by beta\.test/);
  assert.match(why.d4, /cluster "beta_prices" belongs to beta\.test/);
  assert.match(why.d5, /title too close/);
  assert.match(why.d6, /slug "premier-article" already used/);
});

test('wikitours.ma reserved concepts and keywords are always banned', () => {
  const r = topicConflicts(t('e1', { concept_id: 'gammes_omra', primary_keyword: 'agence omra casablanca' }), 'alpha.test', [], project);
  assert.ok(r.some(x => /reserved for wikitours\.ma/.test(x)));
  assert.ok(r.some(x => /wikitours\.ma-reserved topic/.test(x)));
});

test('post counts for the cadence and evergreen slugs', () => {
  const c = postCounts(content, 'alpha.test', '2026-10-06', isoWeek('2026-10-06'));
  assert.deepEqual(c, { today: 1, week: 4, todayByLang: { fr: 1 } }); // posts dated 05-08 Oct, the draft included (it holds a slot)
  assert.equal(slugify('Omra Ramadan 2027 : les dates limites 1448'), 'omra-ramadan-les-dates-limites');
  assert.equal(topicSlug({ primary_keyword: 'Prix moyen Omra Ramadan', id: 'x' }), 'prix-moyen-omra-ramadan');
});

test('planner proposals: deduped against the network and each other, unknown facts become blocked topics', () => {
  const topicsBySite = { 'alpha.test': [alphaTopic()], 'beta.test': [] };
  const base = { slug: '', cluster: 'test_dates', type: 'checklist', angle: 'a', outline: ['x'], missing_facts: [], internal_links: ['guide-test', 'nope'], sister_links: [{ site: 'beta.test', slug: 'article-beta' }, { site: 'gamma.test', slug: 'x' }], wt_target: '', cta_topic: '', notes: '' };
  const proposals = [
    { ...base, title: 'Calendrier de démonstration : relire chaque échéance', primary_keyword: 'relire echeance test', concept_id: 'test_deadlines', facts_needed: ['fact_test_last_visa'] },
    { ...base, title: 'Calendrier de démonstration : relire chaque échéance', primary_keyword: 'relire echeance test', concept_id: 'test_deadlines_bis', facts_needed: ['fact_test_last_visa'] }, // duplicate of the first
    { ...base, title: 'Un sujet qui existe déjà dans le réseau de test', primary_keyword: 'derniere date utile test', concept_id: 'test_dup', facts_needed: ['fact_test_last_visa'] }, // queued topic keyword
    { ...base, title: 'Un sujet qui attend un fait encore inconnu', primary_keyword: 'fait inconnu test', concept_id: 'test_unknown', facts_needed: ['fact_invented'] },
    { ...base, title: 'Trop court', primary_keyword: 'court test', concept_id: 'test_short', facts_needed: ['fact_test_last_visa'] },
    { ...base, title: 'Un sujet sans aucun fait du registre de test', primary_keyword: 'sans fait test', concept_id: 'test_nofact', facts_needed: [] },
    { ...base, title: 'Les gammes Omra expliquées pour la démonstration', primary_keyword: 'gammes omra test', concept_id: 'gammes_omra', facts_needed: ['fact_test_last_visa'] },
  ];
  const { accepted, rejected } = acceptProposals({ proposals, site: 'alpha.test', lang: 'fr', project, content, topicsBySite, today: TODAY, minDays: 0, kwRegistry: null });
  assert.deepEqual(accepted.map(a => a.concept_id), ['test_deadlines', 'test_unknown']);
  const [ok, blocked] = accepted;
  assert.equal(ok.status, 'queued'); assert.equal(ok.id, 'al-fr-0002'); assert.equal(ok.slug, 'relire-echeance-test');
  assert.deepEqual(ok.internal_links, ['guide-test']);
  assert.deepEqual(ok.sister_links, [{ site: 'beta.test', slug: 'article-beta' }]);
  assert.equal(blocked.status, 'blocked'); assert.deepEqual(blocked.facts_needed, []);
  assert.match(blocked.missing_facts[0], /fact_invented/);
  assert.equal(rejected.length, 5);
  const reasons = rejected.map(r => r.reasons.join(' ')).join('\n');
  assert.match(reasons, /proposal al-fr-0002/);
  assert.match(reasons, /topic al-fr-0001/);
  assert.match(reasons, /title length/);
  assert.match(reasons, /needs at least 1 registry fact/);
  assert.match(reasons, /reserved for wikitours\.ma/);
});
