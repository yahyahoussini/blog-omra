// Copies the two-site fixture (tests/fixtures/mini) to a temp dir and adds the automation config files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE = path.join(HERE, '..', 'fixtures', 'mini');
export const REPO = path.join(HERE, '..', '..');
export const TODAY = '2026-10-20';

export const baseCadence = () => ({
  paused: false, publish_mode: 'auto', launch_date: '2026-10-01', max_posts_per_day_per_site: 3, max_posts_per_language_per_day: 1,
  ramp: [{ from_day: 1, per_day: 1 }, { from_day: 15, per_day: 2 }, { from_day: 29, per_day: 3 }],
  min_fact_days_left: 0, queue_target_days: 30, sites: {}, monthly_spend_cap_usd: 10, spend_alert_share: 0.8,
  claude: { max_tokens: 1000, effort: null, price_usd_per_mtok: { input: 5, output: 25, cache_write: 6.25, cache_read: 0.5 } },
});

const dirs = [];
export function cleanup() { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); }

export function tmpNetwork({ cadence = {}, topics = {}, health = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omra-auto-'));
  dirs.push(dir);
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const w = (f, data) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), typeof data === 'string' ? data : JSON.stringify(data, null, 2)); };
  w('config/cadence.json', { ...baseCadence(), ...cadence });
  w('config/killswitch.json', JSON.parse(fs.readFileSync(path.join(REPO, 'config/killswitch.json'), 'utf8')));
  w('config/charters.json', { audience: 'test readers', sites: { 'alpha.test': { job: 'dates de test', owns: ['dates'], never: ['prix'] }, 'beta.test': { job: 'prix de test', owns: ['prix'], never: ['dates'] } } });
  w('docs/ENGINE.md', fs.readFileSync(path.join(REPO, 'docs/ENGINE.md'), 'utf8'));
  for (const [site, list] of Object.entries(topics)) w(`content/${site}/topics.json`, list);
  if (health) w('data/state/health.json', health);
  return dir;
}

export const readJson = (dir, f, fallback) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : fallback);
export const readLines = (dir, f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []);

// A topic for alpha.test that the fixture registry can support.
export const alphaTopic = (extra = {}) => ({
  id: 'al-fr-0001', title: 'Dernière date utile : la vérifier pas à pas', slug: 'derniere-date-utile', primary_keyword: 'derniere date utile test',
  cluster: 'test_dates', concept_id: 'test_last_date', type: 'checklist', tier: 'C', angle: 'checklist', outline: ['repérer', 'comparer', 'relire'],
  facts_needed: ['fact_test_last_visa'], internal_links: ['guide-test', 'premier-article', 'deuxieme-article'], sister_links: [], cta_topic: 'Question test',
  status: 'queued', notes: '', ...extra,
});

// A draft that passes every gate on the fixture network.
export const GOOD_DRAFT = `---
title: "Dernière date utile : la vérifier pas à pas"
description: "Une méthode courte pour situer la dernière date utile du calendrier de démonstration, relire sa source officielle et noter ses limites."
summary: "Situer la dernière date utile du calendrier de démonstration."
slug: ignored-by-the-generator
reviewed_by: someone
---
:::answer
La dernière délivrance prévue par le calendrier de démonstration tombe le 9 mars 2027 [[fact:fact_test_last_visa]]. Gardez une marge avant cette échéance et relisez la source officielle avant de payer quoi que ce soit.
:::

## Trois gestes simples

:::steps
1. Ouvrir le [[link:guide-test|calendrier complet]] et repérer la ligne de fin de saison.
2. Comparer avec le [[link:premier-article|premier article]], qui détaille la fenêtre d'utilisation.
3. Relire la [[link:deuxieme-article|liste du dossier]] avant toute signature.
:::

Notez sur papier le jour de votre dernière vérification : une source officielle peut changer sans prévenir, et un rappel écrit évite les mauvaises surprises au moment de partir.
`;

export const BAD_DRAFT = `---
title: "Dernière date utile : la vérifier pas à pas"
description: "Une méthode courte pour situer la dernière date utile du calendrier de démonstration, relire sa source officielle et noter ses limites."
---
Le vaccin est obligatoire au moins 10 jours avant le départ. [[MISSING: délai minimal du vaccin avant le départ]]

Voir le [[link:guide-test|calendrier]].
`;
