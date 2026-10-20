# Engine: the writer's contract

This file is for everyone who adds content, themes or automation to the network: site agents, writers,
the generator. Read `docs/strategy/DECISIONS.md` first (it wins over the strategy), then this file.

**Languages (DECISIONS D-H):** every site publishes French at the root, Arabic under `/ar/` (RTL, Modern Standard
Arabic) and English under `/en/`. Each language has its own topic plan and native writing: **no translation, no
mirroring**. Put files in `content/<domain>/fr|ar|en/{pages,posts}/`. Each language needs its own `type: home` page
before anything in that language builds.

- **Commands:** `npm run build` (render + all gates, writes `dist/<domain>/` only when there is no gate error),
  `npm run check` (all gates, writes nothing but the report), `npm test`.
- **Report:** every run writes `dist/_reports/gates.json` (errors, warnings, excluded files).
- **Options:** `node scripts/build.js --site guideomra.ma` (write one site; all sites are still rendered and gated
  together, because several gates are network-wide), `--today 2026-11-01` (pretend date), `--no-strict`
  (write even with errors, for debugging only), `--verbose`, `--root <dir>`, `--out <dir>`.
- **Node 22, ES modules, no build step.** The only runtime dependencies are gray-matter, markdown-it,
  markdown-it-container, ajv and ajv-formats (csv-parse and @anthropic-ai/sdk are installed for the automation).

## 1. Layout

```
config/network.json            8 sites: domain, name, ref code, role, cf_project, languages, theme, flows, money_share_cap, robots
config/sites/<domain>.json     per-site: name, tagline, nav, footer_nav, whatsapp, labels, home sections, blog, clusters, redirects
config/link-policy.json        DECISIONS D-D caps (sister and wikitours.ma links)
config/wikitours-targets.json  the only wikitours.ma URLs we may link to + reserved concepts / keywords
config/approved-phrases.json   fixed expressions ignored by the digit check; exceptions to banned words
config/entities.json           allowed entity names (warning gate)
config/publisher.json          the shared Organization (@id https://wikitours.ma/#org); null fields stay null until proven
config/authors.json            REAL people only (empty today: every byline is the organisation)
config/legal.json              legal_ok: lawyer sign-off date, or null
config/cadence.json            publish mode and ramp (read by the automation, not by the engine)
data/facts/registry.json       the only allowed source of numbers, dates and rules (STRATEGY 10.3 schema)
data/facts/candidates.jsonl    proposals waiting for a human (never usable)
data/facts/kb/                 approved religious texts (empty until a religious reviewer is named)
content/<domain>/<lang>/pages/<slug>.md   pages (home, pillars, trust pages, tools...)
content/<domain>/<lang>/posts/<slug>.md   blog posts
content/<domain>/topics.json   planned topics (site agents fill it; the engine does not read it)
themes/<domain>/theme.js + style.css      per-site theme
engine/lib/                    engine code (build, render, gates, facts gate, shortcodes, schema, seo, wa, ...)
engine/templates/              default templates, default labels, base.css
engine/schemas/                front-matter and registry JSON Schemas (ajv, draft 2020-12)
scripts/build.js, check.js     CLIs; scripts/todo.js is the placeholder for generate/plan/publish/monitor/report
tests/                         node:test suites; tests/fixtures/mini is a two-site fixture network (synthetic)
```

## 2. Adding a page or a post

1. Pick the site and check the topic is not owned elsewhere: `primary_keyword`, `concept_id` and `cluster`
   must be unique network-wide (section 9, gate *cannibalisation*). Never a wikitours.ma reserved topic
   (`config/wikitours-targets.json` → `reserved_concepts`, `reserved_keyword_patterns`).
2. Create `content/<domain>/fr/posts/<slug>.md` (or `pages/`). **The file name must equal `slug`.**
3. Write front matter (section 3) and the body (sections 4-6). Every number, date and rule needs a
   `[[fact:...]]` marker that points to an approved registry fact (section 6).
4. Posts need at least 3 same-site links in the body, at least 1 source (2 for pillar, guide, news, data),
   and a `:::unknown` section if they are a pillar, guide or explainer.
5. Run `npm run check`. Fix every error. Warnings go to the weekly digest.
6. `status: published` with a future `date` = scheduled: the page builds on that date.

## 3. Front matter

YAML between `---` lines. Validated by `engine/schemas/frontmatter.schema.json` (unknown fields are errors).

| Field | Required | Values / rule |
|---|---|---|
| `title` | yes | 20-70 characters after markers are removed; unique network-wide; becomes `<title>` and the H1. May contain `[[fact:id]]` (stripped on render) when it has a number. A year lower than the current season year blocks (gate *stale-year*). |
| `description` | yes | 70-160 characters, unique network-wide. Markers allowed (stripped). |
| `slug` | yes | `^[a-z0-9]+(-[a-z0-9]+)*$`, ASCII, no year, = file name. Reserved for pages: `blog`, `sujets`, `ar`, `go`, `assets`, `page`. |
| `type` | yes | `home` · `pillar` · `guide` · `explainer` · `checklist` · `hub` · `local` · `data` · `news` · `trust` · `tool`. `home` and `trust` are pages only. One `home` per site and language (URL `/`). |
| `tier` | posts and pillar/guide/explainer/checklist/local/data/news pages | `A` (named author + reviewer expected; warning if `org`), `B` (data line), `C` (AI line). |
| `lang` | yes | `fr` (root), `ar` (under `/ar/`, `dir="rtl"`) or `en` (under `/en/`); must match the folder. |
| `date` | yes | `YYYY-MM-DD`, first publication. Future date = scheduled. |
| `updated` | no | `YYYY-MM-DD`, only for a substantive change (drives `dateModified` and sitemap `lastmod`). |
| `status` | yes | `published` · `draft` · `retired` (only `published` builds). |
| `primary_keyword` | posts + article pages | unique per language network-wide (compared by match key: accents, stop words and years removed). |
| `cluster` | posts + article pages | `^[a-z0-9_]+$`. A topical group on **one** site (a cluster id cannot appear on two sites). Drives related posts, the pillar's « Dans ce dossier » list and breadcrumbs. |
| `concept_id` | posts + article pages | `^[a-z0-9_]+$`. The search intent. A concept lives on **one site** in every language, and at most once per language on that site (D-H). |
| `author` | no (default `org`) | `org` or an id in `config/authors.json` (real people only). |
| `reviewed_by`, `reviewed_at`, `full_read` | no | `reviewed_by` must be in `authors.json` and requires `reviewed_at` and `full_read: true`. Renders « Relu par … ». Recommended for Arabic pages (warning *arabic-review*; D-H overrides the strategy's blocking gate 21). Never fill it unless that person read the whole page. |
| `facts_used` | no | Extra fact ids; the engine derives the list from the markers anyway. |
| `sources` | no | `[{ title, publisher, url, accessed }]`. Listed first, then the sources of every cited fact. |
| `faq` | no | `[{ q, a }]`, max 12. Rendered as a section; adds `FAQPage` JSON-LD. Answers may use shortcodes and must pass the facts gate. |
| `cta` | no (default whatsapp) | `{ type: whatsapp \| wikitours \| none, topic?, wt_target? }`. `topic` goes into the WhatsApp message. `wikitours` adds a link to `wt_target` in the CTA box (counts as the post's one wikitours.ma link). Trust pages usually use `none`. |
| `noindex` | no | `true` → `<meta name="robots" content="noindex">` and out of the sitemap. |
| `nav_order` | no | Sort order of pages in the home « pillars » list (and of pillars for a cluster). |
| `translation_key` | no | Same value on pages of one site that serve the **same intent** in different languages (written separately) → reciprocal hreflang + x-default (French). Home pages are always linked, without a key. |
| `requires_legal` | no | `true` → excluded from the build until `config/legal.json` has `legal_ok` (prixomra comparisons, agency names, offer boards). |
| `summary` | no | Short text for cards and RSS (falls back to `description`). Gated like the description. |
| `page_id` | no | 1-9999. Pins the 4-digit page id in the WhatsApp reference code. Normally derived from the slug. |

Complete example (`content/omra-ramadan.ma/fr/posts/dates-limites-saison-1448.md`):

```markdown
---
title: "Omra 1448 : les dates limites officielles de la saison"
description: "Dernier visa, dernière entrée, dernier départ : les trois dates officielles de la saison Omra 1448 et ce qu'elles changent pour un départ en Ramadan."
slug: dates-limites-saison-1448
type: explainer
tier: C
lang: fr
date: 2026-11-02
status: published
author: org
primary_keyword: dates limites omra 1448
cluster: calendrier_saison
concept_id: omra_season_deadlines
summary: "Les trois dates officielles qui ferment la saison Omra 1448."
cta:
  type: whatsapp
  topic: "Omra Ramadan – vérifier les dates"
faq:
  - q: "Quelle est la dernière date d'entrée ?"
    a: "La dernière entrée est fixée au 23 mars 2027 [[fact:fact_umrah_1448_last_entry]]."
---
```

## 4. Body shortcodes

Shortcodes are resolved before Markdown, so they also work inside tables. **An unresolved shortcode is a build error.**

| Shortcode | Renders | Rules |
|---|---|---|
| `[[fact:fact_id]]` | a superscript citation `<sup class="cite"><a href="#src-N">N</a></sup>`; the fact's source URLs are added to the numbered source list (« consulté le » = the fact's `verified_at`). | Put it **before** the sentence's final punctuation: `… 2027 [[fact:x]].` A marker after the period belongs to the next sentence. |
| `[[link:slug\|ancre]]` | same-site link to a page or post (same language, falls back to the root language). `[[link:blog\|…]]` = blog index (only if the site has posts). Anchor optional (default: target title). | Counts toward the 3 same-site links a post needs. |
| `[[site:domain/slug\|ancre]]` | followed link to a page or post of a sister site. | Max 2 per post; only towards sites listed in the source site's `flows` (`config/network.json`); no reciprocal page pairs (A→B and B→A); max 5 per sister pair per ISO week. |
| `[[wt:target_id\|ancre]]` | `rel="nofollow"` link to wikitours.ma (`config/wikitours-targets.json`), followed by « (page en anglais) » because only /en/ URLs exist. | Max 1 per post (body + CTA); never in the first sentence; never inside a table; brand or descriptive anchors only; exact-match commercial anchors (« prix omra », « omra pas cher »…) block. Adds the disclosure box automatically. |

wikitours.ma targets today: `home`, `bab-makka`, `gammes-omra`, `hajj-inscription`, `ziyara-medine`.

Plain Markdown links are fine for **outbound citations** (`[texte](https://www.haj.gov.sa/...)`, followed).
Plain links to wikitours.ma, to a sister domain or to the site's own absolute URL are errors: use the shortcodes.
Relative links (`/contact/`) are allowed and must resolve.

## 5. Containers

```markdown
:::answer
Le dernier visa Omra de la saison 1448 sera délivré le 9 mars 2027 [[fact:fact_umrah_1448_last_visa]]. Pour un départ en fin de Ramadan, la dernière entrée possible est le 23 mars 2027 [[fact:fact_umrah_1448_last_entry]].
:::
```

| Container | Renders | Use |
|---|---|---|
| `:::answer` | `<aside class="box box--answer">` + label | Short answer, 40-60 words, first thing after the H1. |
| `:::retenir` | `<aside class="box box--retenir">` | Key facts table or list (every cell with a number cites its fact). |
| `:::unknown` | `<section class="box box--unknown">` with an `<h2>` label | « Ce que nous ne savons pas encore ». **Required** on pillar, guide and explainer pages. |
| `:::disclosure` | `<aside class="box box--disclosure">` | Write your own disclosure; an empty one gets the site's default `disclosureText`. Usually not needed: the engine inserts the box above the first mention of Wiki Tours / Bab Makka (and on pages with a wikitours.ma link). |
| `:::steps` | `<div class="box box--steps">` | Wrap a numbered list (list numbers are not "digits" for the facts gate). |
| `:::warning` | `<aside class="box box--warning">` | Safety or fraud warnings. |
| `:::cta [topic]` | the WhatsApp CTA box after your text (`<div class="cta-inline">`) | Place the CTA in the body; optional topic overrides `cta.topic`. When used, the end-of-page CTA is not repeated. |

Labels come from the theme (`labels.fr.answer`, `labels.fr.retenir`, `labels.fr.unknown`, …), so each site words them
differently. Label text is template text: it is ignored by the facts and duplicate gates.

## 6. Facts: how to write numbers, dates and rules

The facts gate (STRATEGY 10.4, ported verbatim in `engine/lib/facts-gate.js`) reads the title, description,
summary, body, FAQ and image alt texts, sentence by sentence:

- A sentence with **a digit** (Latin or Arabic-Indic) or **a rule word** (obligatoire, interdit, exigé, requis,
  gratuit, garanti, remboursé, quota, visa, vaccin, délai, date limite, and the Arabic واجب, ممنوع, إلزامي, مجاني,
  تأشيرة, مضمون…, any gender/plural form) must cite at least one fact with `[[fact:id]]`.
- Every number in the sentence must be one of the cited facts' `values` (thousand separators and decimal commas
  are normalised: `63 021` = `63.021` = `63021`; `3,8` = `3.8`).
- The fact must be `approved`, not past `review_by`, not past `valid_until`.
- Arabic and English pages cite the same registry ids. The ported gate knows French and Arabic rule words; the
  engine adds English stems for `en` pages. Write numbers with Western digits or Arabic-Indic digits (both checked).
- Facts with confidence `likely` or `estimate` carry a `required_wording`: it must appear **in the same sentence**.
- `config/approved-phrases.json` removes fixed expressions before the digit check (« les 10 dernières nuits »,
  source names with digits such as « Medias24 », « Le360 »). Never add prices or dates there.
- Headings have no final punctuation, so a heading is checked together with the first sentence after it.
  Each table row and each list item is its own sentence.

Examples with real registry ids (checked against `data/facts/registry.json` on 2026-10-20):

```markdown
OK  La dernière délivrance de visas Omra de la saison 1448 est fixée au 9 mars 2027 [[fact:fact_umrah_1448_last_visa]].
OK  Selon le calendrier Umm al-Qura, le 1er Ramadan 1448 tomberait le 8 février 2027 (estimation, sous réserve d'observation du croissant) [[fact:fact_ramadan_1448_start_umq]].
OK  Selon Gulf News, un visa Omra non utilisé est annulé après 30 jours [[fact:fact_umrah_visa_entry_window]].
OK  Le coût définitif du Hajj 1447 est de 63 021 dirhams [[fact:fact_hajj_1447_final_cost]].
OK  Le prix moyen tournait autour de 25 000 dirhams en 2023 et de 35 000 dirhams en 2024, selon la fédération, citée par Medias24 [[fact:fact_ramadan_price_avg_2023_2024]].
OK  | Dernière entrée | 23 mars 2027 [[fact:fact_umrah_1448_last_entry]] |
OK  Pendant les 10 dernières nuits, la foule augmente.                      (approved phrase)

KO  Le vaccin ACWY doit être fait au moins 10 jours avant l'arrivée.         digits-without-fact
KO  Le visa Omra est obligatoire.                                            rule-word-without-fact
KO  Le dernier visa est délivré le 10 mars 2027 [[fact:fact_umrah_1448_last_visa]].   number-not-in-fact (10)
KO  Un visa non utilisé est annulé après 30 jours [[fact:fact_umrah_visa_entry_window]].  required wording « selon Gulf News » missing
KO  Wiki Tours a la licence ODV-25012 [[fact:fact_wikitours_licence]].       fact-not-approved (and the licence gate)
```

Useful ids by topic (see the registry for the full list of 71):

| Topic | Fact ids |
|---|---|
| Ramadan / Hijri dates | `fact_ramadan_1448_start_umq`, `fact_eid_fitr_1448_expected`, `fact_morocco_ramadan_2026_start`, `fact_saudi_ramadan_2026_start`, `fact_morocco_ramadan_2026_offset`, `fact_rajab_1448_start`, `fact_shaaban_1448_start`, `fact_dhul_hijjah_1448_dates`, `fact_muharram_1449_start`, `fact_mawlid_1449`, `fact_morocco_religious_holidays` |
| Umrah season 1448 | `fact_umrah_1448_calendar`, `fact_umrah_1448_visas_open`, `fact_umrah_1448_nusuk_open`, `fact_umrah_1448_last_visa`, `fact_umrah_1448_last_entry`, `fact_umrah_1448_last_departure`, `fact_ramadan_one_permit_2024` |
| Visa / Nusuk | `fact_umrah_visa_entry_window`, `fact_umrah_visa_stay_3_months`, `fact_umrah_multi_entry_visa`, `fact_nusuk_umrah_direct` |
| Health | `fact_acwy_requirement`, `fact_acwy_validity` |
| Hajj | `fact_hajj_1448_registration`, `fact_hajj_1448_eligibility`, `fact_hajj_1448_lottery`, `fact_hajj_1447_timeline`, `fact_hajj_1449_no_announcement`, `fact_hajj_1447_quota`, `fact_hajj_1446_quota_split`, `fact_fm6_hajj_subsidy_1448`, `fact_hajj_1447_final_cost`, `fact_hajj_1448_provisional_cost` |
| Agencies, regulation, fraud | `fact_agency_selection_criteria`, `fact_disputes_amicable_first`, `fact_law_11_16_sanctions`, `fact_law_11_16_reform`, `fact_official_agency_list`, `fact_sanctions_2022`, `fact_saudi_agency_suspension_2026`, `fact_unlicensed_agency_stranded`, `fact_marrakech_fraud_2026`, `fact_observatory_warning_2026`, `fact_licensing_gaps_low_offers`, `fact_dgi_vip_omra_checks` |
| Prices | `fact_ramadan_price_avg_2023_2024`, `fact_ramadan_pilgrims_2023_2024`, `fact_ramadan_2024_drop_causes`, `fact_no_ramadan_2027_price_data` |
| Flights / airports | `fact_flynas_casablanca_jeddah`, `fact_flynas_rabat_jeddah`, `fact_flynas_rabat_2_weekly`, `fact_ram_saudi_routes`, `fact_ram_ramadan_2023_capacity`, `fact_ram_gulf_suspension_2026`, `fact_hajj_2026_flights_onda`, `fact_makkah_route_2026_cmn`, `fact_makkah_route_2026_rba` |
| School calendar | `fact_school_calendar_2026_27`, `fact_school_start_2026`, `fact_school_break_oct_2026`, `fact_school_break_dec_2026`, `fact_school_break_jan_2027`, `fact_school_break_mar_2027`, `fact_school_break_may_2027` |
| Audience | `fact_young_pilgrims_trend`, `fact_influencers_scholars_debate`, `fact_morocco_internet_users_2025` |
| Not usable (proposed) | `fact_wikitours_licence`, `fact_wikitours_since_2016` |

**Stale facts on live pages (registry rule 4).** When a cited fact passes `review_by` or `valid_until`, the
build does not fail: the gate reports a warning, the page shows « Information en cours de mise à jour »
(`.stale-banner`), and 14 days after `review_by` the page becomes `noindex` and leaves the sitemap until the fact
is renewed. The generator must call `factsGate()` directly on drafts, where these are errors.
Most Saudi-rule and price facts have `review_by: 2026-11-19` (30 days): a human must re-confirm them by then.

**Adding a fact.** Never edit numbers into a page. Add a candidate to `data/facts/candidates.jsonl`; a human checks
the source and moves it to `registry.json` with `status: approved`, `verified_by`, `verified_at`, `review_by`
(Saudi rules 30 days, prices 30 days, Hijri estimates until the announcement, entity facts 180 days).
`npm test` validates the registry schema.

## 7. What the engine adds by itself

- **Byline:** « Par Wiki Tours International · Publié le … · mis à jour le … » linking to `/editeur/`.
  Tier C adds « Rédigé avec l'aide d'un outil d'IA à partir de notre registre de faits. Sources consultées le … ».
  Tier B adds « Généré à partir de notre registre de faits. ». « Relu par … » appears only with `reviewed_by` + `full_read`.
  No human review is ever claimed otherwise. Never write a byline or a review line in the body.
- **Numbered sources** (front-matter sources first, then fact sources) and « Sources consultées le / entre … ».
- **Disclosure box** above the first mention of Wiki Tours or Bab Makka, or at the top when the mention is only in
  the title, description, FAQ or a wikitours.ma link.
- **WhatsApp CTA** (unless `cta.type: none`): `https://wa.me/<digits>?text=[REF-0000] Bonjour Wiki Tours, je viens de
  <domain>. <topic>. Nombre de personnes : __` with `rel="nofollow noopener"`. The reference is the site ref + a
  4-digit id derived from the slug (`[OR-0729]`). While `whatsapp.number` is `null` (today, all sites), the button
  links to `/contact/` and the build prints a warning.
- **Related posts** (same cluster, 4 latest), the pillar's « Dans ce dossier » list (all posts of its cluster),
  breadcrumbs (posts: Accueil › pillar of the cluster, or Articles › post).
- **Footer:** only same-site links and « Publié par Wiki Tours International, agence de voyages, Casablanca »
  → `/editeur/`. No sister-site blocks anywhere in templates.
- **JSON-LD @graph:** `Organization` (@id `https://wikitours.ma/#org`, from `config/publisher.json`) on every page;
  `WebSite` on the home; `BreadcrumbList`; `BlogPosting` (posts) or `Article` (pillar/guide/explainer/checklist/local/data/news)
  with the Organization as author when `author: org`; `WebPage` / `CollectionPage` otherwise; `FAQPage` only with `faq`;
  `Dataset` only for `type: data` on a site with `"dataset": true` (prixomra). Never LocalBusiness, TravelAgency,
  Event, HowTo, Review or AggregateRating.
- **Head:** `<html lang="fr-MA" dir="ltr">` (`ar-MA` / `rtl` under `/ar/`, `en-MA` / `ltr` under `/en/`), unique
  title and description, absolute self-canonical, OG + Twitter tags; hreflang between the home pages of a site and
  between `translation_key` pairs on the same site, never across domains.

## 8. URLs and output files (`dist/<domain>/`)

| URL / file | Source |
|---|---|
| `/`, `/ar/`, `/en/` | the `type: home` page of each language |
| `/<slug>/` | pages |
| `/blog/`, `/blog/page/N/` | blog index, `posts_per_page` (network.json, default 12); only when the site has posts |
| `/blog/<slug>/` | posts |
| `/sujets/<cluster>/` | generated cluster hub, only when a cluster has ≥ 3 posts, **no** pillar/hub page with that cluster, and a title in `config/sites/<domain>.json → clusters.<id> { title, description, intro }` |
| `404.html` | not found page (noindex) |
| `sitemap-index.xml`, `sitemap-pages.xml`, `sitemap-posts.xml` | honest `lastmod` (`updated` or `date`; home and blog index = latest post) |
| `rss.xml`, `/ar/rss.xml`, `/en/rss.xml` | last 50 posts per language |
| `robots.txt` | STRATEGY 9.4: search/answer bots allowed; training bots per `network.json → robots.training_bots` (`allow`/`block`); `Disallow: /go/`; Sitemap line |
| `<key>.txt` | IndexNow key: `indexnow_key` in the site config, else derived from the domain |
| `_headers` | security headers (CSP without inline scripts), caching, `X-Robots-Tag: noindex` on `*.pages.dev` |
| `_redirects` | `config/sites/<domain>.json → redirects: [{ from, to, status }]` |
| `favicon.svg` | generated from the theme palette |

## 9. Theme API

`themes/<domain>/theme.js` default-exports:

```js
export default {
  palette: { primary: '#0f5b4a', accent: '#b08d3c' },  // used for the favicon; real colours live in style.css
  fonts: ['system'],                 // or Google Fonts families, e.g. ['Amiri:wght@400;700'] (adds preconnect + stylesheet)
  layout: {
    header: 'split',                 // 'split' | 'centered' | 'stacked' -> .site-header--<value>
    home: ['hero', 'intro', 'pillars', 'latest', 'cta', 'about'],  // home sections, in order
  },
  sectionOrder: ['body', 'cluster', 'faq', 'cta', 'sources', 'related'], // article sections after the header
  labels: { fr: { answer: "L'essentiel", unknown: 'Ce que nous ne savons pas encore', disclosureText: '…' }, ar: { … } },
  templates: {                       // optional overrides: (ctx, ...args, defaults) => html string
    // card: (ctx, page, defaults) => `<li class="card">…</li>`,
    // header: (ctx, defaults) => defaults.header(ctx).replace('…', '…'),
  },
};
```

- `themes/<domain>/style.css` is inlined after `engine/templates/base.css` (one `<style>`, no extra request).
  Set the custom properties `--bg --fg --muted --primary --accent --surface --border --link --focus --font-body --font-head`.
  Use logical properties (`margin-inline-start`) so Arabic pages work. Keep body text ≥ 18 px and visible focus.
- Home sections: `hero` (H1 + tagline), `intro` (the home page body), `pillars` (pages other than home/trust, by
  `nav_order`), `latest` (6 latest posts), `cta`, `about` (link to `/editeur/`). `config/sites/<domain>.json →
  home.sections` overrides the theme. Without `hero`, an `<h1 class="home-title">` is still rendered.
- Overridable templates (see `engine/templates/default.js`): `layout`, `header`, `footer`, `breadcrumbs`, `card`,
  `byline`, `sources`, `faq`, `cta`, `article`, `home`, `listing`, `notFound`. `ctx` holds `site`, `lang`, `L`
  (labels), `prefix`, `nav`, `footerNav`, `editeurUrl`, `page`, and `t(name, ...args)` to call other templates.
  Keep the `<!--nogate-->…<!--/nogate-->` wrappers and the class names the gates read (`box--disclosure`,
  `wt-link`, `cta__button`, `sup.cite`), exactly one `<h1>`, and never add sister-site links to templates.
- Default labels exist for `fr`, `ar` and `en`; every key is listed in `engine/templates/labels.js`. Vary `answer`, `retenir`, `unknown`, `disclosure`,
  `disclosureText`, `ctaTitle` per site. `ownerLine` is fixed by STRATEGY 3.3: do not change it.

Stable class names:

| Area | Classes |
|---|---|
| Page | `body.site.site--<domain-with-dashes>.page--<type>`, `.skip-link`, `main#contenu.site-main` |
| Header | `.site-header.site-header--split\|centered\|stacked`, `.site-header__inner`, `.site-brand`, `.site-brand__name`, `.site-brand__tagline`, `.site-nav`, `.site-nav__list`, `.site-nav__item`, `.site-nav__link[aria-current=page]` |
| Footer | `.site-footer`, `.site-footer__inner`, `.site-footer__nav`, `.site-footer__owner` |
| Article | `.breadcrumbs`, `.breadcrumbs__list`, `.breadcrumbs__item`, `.article.article--<type>`, `.article__header`, `.article__title`, `.byline`, `.byline__meta`, `.byline__review`, `.byline__ai`, `.stale-banner`, `.article__body.prose` |
| Boxes | `.box`, `.box--answer`, `.box--retenir`, `.box--unknown`, `.box--disclosure`, `.box--steps`, `.box--warning`, `.box__label`, `.box__title`, `.table-wrap` |
| Citations / links | `sup.cite`, `.wt-link`, `.lang-note` |
| CTA | `.cta`, `.cta__title`, `.cta__text`, `.cta__button`, `.cta__ref`, `.cta__wt`, `.cta-inline` |
| Sections | `.faq`, `.faq__title`, `.faq__item`, `.faq__q`, `.faq__a`, `.sources`, `.sources__title`, `.sources__list`, `.sources__item`, `.sources__checked`, `.related`, `.related__title`, `.cluster-list`, `.cluster-list__title` |
| Cards / lists | `.cards`, `.card.card--<type>`, `.card__link`, `.card__title`, `.card__summary`, `.card__meta`, `.listing`, `.listing__title`, `.listing__intro`, `.pager`, `.pager__prev`, `.pager__next` |
| Home | `.home`, `.home-title`, `.home-hero`, `.home-hero__title`, `.home-hero__tagline`, `.home-intro`, `.home-pillars`, `.home-latest`, `.home-about`, `.home-section__title` |
| 404 | `.not-found`, `.not-found__title` |

Tools (offresomra comparison, etc.): put vanilla JS in a static file served under `/assets/` (CSP blocks inline
scripts). Static asset copying is not implemented yet (see limitations).

## 10. Site config (`config/sites/<domain>.json`)

```json
{
  "name": "Guide Omra", "tagline": "…", "ref": "GO",
  "nav": [{ "label": "Articles", "slug": "blog" }, { "label": "Contact", "slug": "contact" }],
  "footer_nav": [{ "label": "L'éditeur", "slug": "editeur" }, { "label": "Contact", "slug": "contact" }],
  "whatsapp": { "number": null, "default_topic": "Question sur la préparation de ma Omra" },
  "labels": { "fr": {} },
  "home": { "sections": ["hero", "intro", "pillars", "latest", "cta", "about"] },
  "blog": { "title": "Articles – Guide Omra", "description": "70-160 caractères…", "intro": null },
  "clusters": { "rites_omra": { "title": "…", "description": "…" } },
  "redirects": [{ "from": "/ancien/", "to": "/nouveau/", "status": 301 }],
  "indexnow_key": "optional-8-to-128-chars"
}
```

Nav entries resolve like `[[link:]]` (add `"lang": "ar"` or `"lang": "en"` for those menus; entries without `lang` are French); an unresolved entry is an error,
except `blog` before the first post. Every site needs `editeur` and `contact` pages (footer, CTA fallback).
`whatsapp.number`: international format `212XXXXXXXXX`; until the client gives it, keep `null`.

## 11. Gates (`engine/lib/gates.js`)

Errors block the build (exit 1, nothing written); warnings are printed and saved in `dist/_reports/gates.json`.

| Gate | Level | Rule |
|---|---|---|
| registry | error | every fact validates against `engine/schemas/registry.schema.json`; unique ids |
| frontmatter | error (warning for drafts) | schema; slug = file name; posts need tier/primary_keyword/cluster/concept_id; author and reviewer in authors.json; one home per site+language; unique slugs; valid `cta.wt_target` |
| arabic-review | warning | published AR page without `reviewed_by` + `full_read` (D-H: recommended, not blocking) |
| byline | warning | tier A with the organisation byline |
| facts | error | facts gate (title, description, summary, body, FAQ, alt) + required wording; on English pages also English rule words (mandatory, required, forbidden, prohibited, free of charge, guarantee, refund, deadline); stale facts = warning + banner |
| entities | warning | names that look like agencies/airlines and are not in `config/entities.json` |
| cannibalisation | error | primary_keyword unique per language; concept_id on one site only and once per language; cluster on one site only; reserved concepts/keywords; title token Jaccard ≥ 0.6 (same language) |
| duplicate | error / warning | 5-shingle Jaccard ≥ 0.5 or SimHash-64 Hamming ≤ 3 (pages ≥ 40 words) blocks; 0.3-0.5 warns; all pages network-wide incl. trust pages; labels, disclosure and CTA text stripped |
| citations | error | sources ≥ 2 for pillar/guide/news/data, ≥ 1 for other article types and every post; home/trust/hub/tool pages 0 |
| links | error | unresolved shortcodes; posts ≥ 3 same-site body links; ≤ 2 sister links, only along flows; ≤ 5 per sister pair per week; no reciprocal page pairs; ≤ 1 wikitours.ma link, `nofollow`, not in the first sentence, not in a table, no commercial exact-match anchor; no raw links to wikitours.ma/sister/own domain; every internal href/src resolves; no orphan pages; share of posts with a wikitours.ma link above the site cap and brand anchors < 60% = warnings |
| disclosure | error | Wiki Tours / Bab Makka mention or wikitours.ma link without the disclosure box |
| meta | error (warning for generated pages) | title 20-70, description 70-160, both unique network-wide; exactly one `<h1>`; `lang`/`dir`; self-canonical |
| stale-year | error (warning for news/data) | a 20xx year in the title lower than the season year (season year = next year from 1 June) |
| banned-claim | error | « garanti(e)(s) », « 100 % », « مضمون », « 0 % d'intérêt », « sans intérêt », fake urgency (« dernières places », « places limitées », « dépêchez-vous »…), superlatives about Wiki Tours; on English pages also « guaranteed », « 0% interest / interest-free », « last seats », « hurry ». Exceptions in `approved-phrases.json → banned_claim_exceptions` (« garanties financières ») |
| schema | error | JSON-LD parses; no LocalBusiness / TravelAgency / Event / HowTo / Review / AggregateRating |
| unknowns | error | pillar, guide, explainer without `:::unknown` |
| licence | error | licence number patterns (« ODV-… », « licence n° ») or « depuis 2016 » anywhere in the HTML unless the fact is `approved` with `source_tier: official` (and `publisher.licence.official_list_url` for the licence) |
| excluded | info | drafts, retired, scheduled, `requires_legal` without `legal_ok` |
| word-floor | warning | editorial floors (STRATEGY 7.3); not a ranking rule |
| images | warning | image without alt text |
| whatsapp | warning | `whatsapp.number` is null |

Not automated here: claims verifier (Wave 2), religious-text KB matching (gate 4, KB empty), offer freshness
(gate 11, no offer records yet), Lighthouse (gate 18), per-pair monthly 25% share (replaced by D-D's weekly cap).

## 12. For the automation agent

- `import { buildNetwork } from './engine/lib/build.js'` → `{ pages, generated, outputs, findings, errors, warnings, excluded, written }`.
  Pass `write: false` to gate a candidate set; `today` to simulate a date.
- `import { factsGate, requiredWordingGate } from './engine/lib/facts-gate.js'` for drafts (stale facts are errors there).
- `import { getModel } from './engine/lib/model.js'` reads `CLAUDE_MODEL` and throws when it is missing. Never write a model id in the repo.
- `import { indexNowKey, submitIndexNow } from './engine/lib/indexnow.js'`; `waLink` in `engine/lib/wa.js`.
- Cadence (D-C + D-H): the 3 posts/day/site ceiling is 1 French + 1 Arabic + 1 English after the ramp.
- `npm run generate|plan|publish|monitor|report` are placeholders (`scripts/todo.js`, exit 1) to replace.
- The remaining prototypes (`cluster.js`, `csv.js`, `semrush-ingest.js`, `schedule.js`, `gsc-pull.js`, `feed.js`)
  are not ported yet; `normalize.js`, `similarity.js`, the gates, the facts gate and `indexnow.js` are.

## 13. Known limitations

- No static asset pipeline yet (images, `/assets/*.js` for tools): add files under `themes/<domain>/assets/` and a
  copy step when the first tool or image arrives. Image gate 17 only checks alt text.
- Cluster hubs need a title in the site config; posts' breadcrumbs point to the pillar or to the blog index, not to a generated hub.
- Duplicate SimHash comparison is pairwise (fine for a few thousand pages; the Jaccard part uses an inverted index).
- The entity gate is a heuristic (capitalised names before « Tours », « Travel », « Voyages », « Airlines », or after « agence »).
- gray-matter pulls an old js-yaml with a moderate `npm audit` advisory (ReDoS in sprintf-js); content is our own, so the risk is low.
