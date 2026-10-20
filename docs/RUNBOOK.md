# Runbook: running the Omra network

This guide is for the client (Wiki Tours International) and anyone who runs the network day to day.
It uses simple words. Technical details are in `docs/ENGINE.md` (writing rules) and `docs/strategy/DECISIONS.md`
(the decisions you made, which win over the strategy).

## 1. What runs by itself

Everything runs in GitHub Actions, the automation built into the GitHub repository. Nothing runs on your computer.

| Workflow | When (UTC) | What it does |
|---|---|---|
| `daily` | every day at 04:13 (05:13 in Morocco) | 1. checks the safety switches (`monitor`), 2. writes today's posts (`generate`), 3. runs every quality gate (`check`), 4. builds the 8 sites (`build`), 5. sends the sites that changed to Cloudflare Pages and tells Bing about new pages (`publish`), 6. saves the new posts and state files back in the repository |
| `weekly` | Sunday at 18:23 | 1. plans new topics for sites whose queue is getting short (`plan-topics`), 2. writes the weekly report (including a check that every wikitours.ma link target still answers) and opens a GitHub issue « Revue hebdo YYYY-Www » for you |
| `ci` | on every change pushed to GitHub | runs the tests, the gates and a full build, and prints one sample brief (no AI call) |

You can start `daily` or `weekly` by hand: GitHub → **Actions** → pick the workflow → **Run workflow**.

Steps that need a missing secret skip themselves with a message instead of failing. For example, without the
Claude key nothing is written, and without the Cloudflare keys nothing is deployed.

## 2. One-time setup

Do these steps once, in this order. Allow about half a day. Some steps depend on your domain registrar;
the registration rules for `.ma` domains were not researched, so check with your registrar.

### 2.1 GitHub

1. The repository must be on GitHub with Actions enabled (**Settings → Actions → General → Allow all actions**).
2. Scheduled workflows run only on the **default branch** (usually `main`). Merge this work into it.
3. In **Settings → Actions → General → Workflow permissions**, keep the default. The workflows ask for the
   rights they need (`contents: write` to save posts, `issues: write` for the weekly issue). If your organisation
   forces read-only tokens, allow read and write for this repository.

### 2.2 Secrets and the model variable

In GitHub → **Settings → Secrets and variables → Actions**:

| Name | Type | Required? | What to put |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | yes, to write posts | An API key from the Claude Console (console.anthropic.com → API keys). Set a monthly spend limit there too. |
| `CLAUDE_MODEL` | **Variable** (Variables tab, not Secrets) | yes, to write posts | The Claude model id you choose, copied exactly from Anthropic's models page. It is never written in the code. Change it here when you want another model. |
| `CLOUDFLARE_API_TOKEN` | Secret | yes, to go live | A Cloudflare API token with the permission **Account → Cloudflare Pages → Edit** (Cloudflare dashboard → My Profile → API Tokens → Create Token). |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | yes, to go live | Your Cloudflare account id (shown on the right side of the account home page). |
| `GOOGLE_SA_JSON` | Secret | optional | The whole JSON key file of a Google service account (see 2.4). Without it the safety switches use internal signals only. |

`GITHUB_TOKEN` is created by GitHub on every run; you do not add it.

When you change the model, also update the prices in `config/cadence.json → claude.price_usd_per_mtok`
(see section 9), so the cost estimate stays right.

### 2.3 Cloudflare Pages: 8 projects, 8 domains

Each site is one Cloudflare Pages project. The project names are in `config/network.json → cf_project`
(`guideomra`, `omra-ramadan`, `agenceomra`, `prixomra`, `voyageomra`, `omracasablanca`, `omrarabat`, `offresomra`).

1. **Create the projects** (once). Either in the dashboard (Workers & Pages → Create → Pages → **Upload assets**,
   "Direct Upload", use the exact name above), or from a computer with Node installed:
   `npx wrangler pages project create guideomra --production-branch=main` (repeat for each name).
2. **Add each domain to Cloudflare** (Websites → Add a site → `guideomra.ma`, free plan), then change the domain's
   nameservers at your `.ma` registrar to the two Cloudflare nameservers shown. This is the simplest way, because
   a bare domain (`guideomra.ma`, without `www`) usually cannot point to Pages otherwise.
3. **Connect the domain**: Pages project → **Custom domains** → Set up a domain → `guideomra.ma`. Cloudflare adds the
   DNS record and the HTTPS certificate itself. Add `www.guideomra.ma` too if you want it (it redirects).
4. **Let the search and answer bots in.** New Cloudflare zones can block AI crawlers by default. For each domain:
   **Security → Bots** (and **AI Crawl Control / AI Audit** if shown): do not block verified bots, and allow the
   search and answer bots listed in `robots.txt` (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot,
   Claude-SearchBot, Claude-User). Leave « Block AI bots » off unless you decide to block training bots (STRATEGY 9.4).
5. Repeat for the 8 sites. Until the first deploy, the project is empty: run the `daily` workflow once by hand.

The `*.pages.dev` preview addresses are marked `noindex` automatically, so Google only indexes the real domains.

### 2.4 Google Search Console (optional, recommended)

1. In Search Console, add each site as a **Domain property** (`guideomra.ma`) and verify it with the DNS TXT record
   Google gives you (add it in Cloudflare DNS).
2. Submit `https://<domain>/sitemap-index.xml` in **Sitemaps** for each property.
3. For the automation to read the numbers: in Google Cloud Console create a project, enable the
   **Google Search Console API**, create a **service account**, then **Keys → Add key → JSON**. Paste the whole file
   into the `GOOGLE_SA_JSON` secret.
4. In each Search Console property: **Settings → Users and permissions → Add user** → the service account's email,
   permission **Restricted** (read only is enough).

### 2.5 Bing and IndexNow

- **Bing Webmaster Tools**: sign in, choose **Import from Google Search Console**. It imports your sites and sitemaps.
- **IndexNow** (Bing, Yandex and others; Google does not use it): nothing to do. Every site publishes its key file
  (`/<key>.txt`) automatically, and `publish` sends the new and changed pages to `api.indexnow.org` after each deploy.

### 2.6 Before the first post

- **WhatsApp number**: put the agency number in `config/sites/<domain>.json → whatsapp.number`, format `212XXXXXXXXX`.
  Until then, the WhatsApp buttons open the site's contact page.
- **Facts to re-confirm by 19 November 2026**: 20 of the 69 approved facts (29 %) have `review_by: 2026-11-19`.
  A real person must check each source and renew the date (section 7). If more than 20 % of the approved facts
  pass their `review_by` date, the network goes into **maintenance mode** and stops writing posts until they are renewed.
  **With a launch on 9 November 2026, this happens on ramp day 12** unless the re-check is done first: plan it
  before launch, or launch after the re-check.
- Run `npm run check` (or look at the last `ci` run): it must show 0 errors.

## 3. Starting: set the launch date

The generator does **nothing** while `launch_date` is `null`. To start:

1. Open `config/cadence.json`.
2. Set `"launch_date": "2026-11-09"` (the first publishing day, Morocco date).
3. Commit the change.

The ramp (DECISIONS D-C) then works like this, per site:

| Days after launch | Posts per day per site | Languages (when the site has French, Arabic and English home pages) |
|---|---|---|
| 1-14 | 1 | one language a day, in turn: French, then Arabic, then English, then French again… |
| 15-28 | 2 | two languages a day, in turn (French + Arabic, then English + French, then Arabic + English…) |
| from 29 | 3 | 1 French + 1 Arabic + 1 English every day (DECISIONS D-H) |

So each language gets the same share. Never more than one post per language, site and day. If a language has no
topic ready that day, its slot goes to another language instead of being lost. The order is
`config/cadence.json → languages`.

A language gets posts only after its own home page exists. **Today only French has home pages, so every site
publishes at most 1 post per day (`max_posts_per_language_per_day: 1`), whatever the ramp says.** Days 15-28 (2/day)
and 29+ (3/day) need native Arabic and English pages first: for each of the 8 sites, a `home`, an `editeur` and a
`contact` page in `content/<domain>/ar/pages/` and `content/<domain>/en/pages/` (48 pages), written natively, not
translated (DECISIONS D-H), by a native writer the client names (an Arabic reviewer is recommended). The weekly
planner then fills the Arabic and English queues by itself. Facts that need a `required_wording` also need
`required_wording_ar` / `required_wording_en` before Arabic or English posts can cite them (section 7).

### Three languages, written separately

Every site publishes French at the root (`https://guideomra.ma/`), Arabic under `/ar/` (written right to left) and
English under `/en/`. Each language has its own pages and its own topics: **nothing is translated** (DECISIONS D-H).
A page that exists in French does not have to exist in Arabic or English. When two pages of the same site really
answer the same question in two languages, writers give them the same `translation_key`: search engines then see
them as language versions (hreflang), and the language switcher (FR · العربية · EN, at the top of every page) jumps
between them. Otherwise the switcher opens the other language's home page. Pages of different sites are never linked
this way.

A site with no eligible topic left simply waits (it never pads). The ceiling of 3 is `max_posts_per_day_per_site`;
the ramp is the `ramp` list in the same file.

## 4. The weekly ritual (about 30-90 minutes)

Every Sunday evening a GitHub issue « Revue hebdo YYYY-Www » appears with the one-page report and a checklist.
The same report is saved in `reports/`.

1. **Read the issue.** Start with the RED and AMBER lines (paused or slowed sites) and the reasons.
2. **Search Console**: check **Manual actions** and **Security issues** for every site.
3. **Facts**: renew or fix every fact listed in « Facts to renew »; answer the missing-fact requests (section 7).
4. **Read 3 posts published this week** and answer the 6 questions of the strategy rubric (correct numbers? answers
   the title? nothing misleading? disclosure present? useful without contacting us? right tone?).
5. **Retire a bad post**: open its file (`content/<domain>/<lang>/posts/<slug>.md`), change `status: published` to
   `status: retired`, commit. It disappears at the next daily run. If the page had visitors, also add a redirect in
   `config/sites/<domain>.json → redirects` (for example to the blog index). Links to it from other pages become
   plain text and show as warnings in the next report: search `content/` for the slug and remove those links.
   Do not delete the file: a link to a page that no longer exists at all is an error that stops that site's deploys.
6. **Manual checks** (these switches are not automated): Search Console **Manual actions** and **Security issues**
   (step 2); « Crawled – currently not indexed » share in **Pages**; whether a Google core update is rolling out
   (Google Search Status Dashboard: hold changes while it rolls out); the official sources of time-critical facts
   (Nusuk, haj.gov.sa, habous.gov.ma) for announcements; leads that look abnormal; any confirmed fact error (pause
   the site in `config/killswitch.json → manual` until it is fixed). The index ratio is report-only until you set
   `index_proxy.enforced: true` in `config/killswitch.json`.
7. **Close the issue.** Closing it means « review done ».

**Why closing matters (dead-man switch).** If no weekly issue is closed for **10 days**, every site slows to half
speed. After **21 days**, all writing stops. Closing the next issue restores normal speed at the next daily run.
If GitHub cannot be asked (an outage), the last known state is kept, and after 2 days in a row the sites slow to
half speed anyway: the switch never fails open.

## 5. Pausing

- **Stop everything (one switch)**: `config/cadence.json` → `"paused": true`, commit. Nothing is written and nothing
  is deployed until you set it back to `false`.
- **Stop one site**: `config/cadence.json → sites.<domain>.enabled: false`.
- **Freeze after a Google problem** (manual action, security issue): `config/killswitch.json → "network_freeze": true`.
- **Slow or pause one site for a reason you note**: `config/killswitch.json → manual`, for example
  `{ "agenceomra.ma": { "paused": true, "reason": "fact error being fixed" } }` or `{ "multiplier": 0.5 }`.

The automatic switches (`config/killswitch.json`, all thresholds are design choices to recalibrate after 8 weeks of
data) are recomputed every day by `monitor` into `data/state/health.json`:

| Signal | Action |
|---|---|
| No closed weekly issue for 10 / 21 days | half speed / stop writing (all sites) |
| More than 25 % of drafts failed the gates in 7 days (at least 4 drafts) | half speed for that site |
| New posts too similar to existing ones | half speed for that site |
| More than 20 % of approved facts past `review_by` | stop writing (maintenance mode) |
| Search Console impressions fell below half of the usual week (needs `GOOGLE_SA_JSON`) | pause that site; 2 sites in the same week = all sites |
| Monthly Claude spend reaches the cap | stop writing until next month |

Already published pages stay online and keep being rebuilt (so « Information en cours de mise à jour » banners
appear when facts expire). Only the « stop everything » switch also stops deploys.

**Deploys are per site.** A gate error blocks only the site it belongs to: that site keeps its previous version
online, the other sites are deployed, and the daily run ends red so you notice. A registry error blocks all sites.

## 6. Auto mode or review mode

`config/cadence.json → "publish_mode"`:

- `"auto"` (your decision, DECISIONS D-C): a post that passes every automated gate goes live the same day without a
  human read. This is the highest-risk setting under Google's rules on scaled AI content.
- `"review"`: posts are written with `status: draft` and listed in `data/queue/<YYYY-Www>.json`. To publish one,
  read it, change `status: draft` to `status: published` in its file (set `date` to the publication day), commit.
  Drafts you do not want: set `status: retired`.

Switching is one line; it takes effect at the next daily run.

## 7. Facts: the only source of numbers and rules

The AI may only state a number, a date or a rule that is in `data/facts/registry.json` with `status: approved`.
The generator also writes **missing-fact requests** to `data/facts/candidates.jsonl` when it needed a fact it did
not have; they are listed in the weekly report.

To add or renew a fact, edit `data/facts/registry.json` (a list of entries). You may also keep facts in extra files
in `data/facts/extra/` (for example `data/facts/extra/hajj-1448.json`), same format; they are read together. An id may
appear only once across all files: a repeated id stops the build of every site until it is fixed. Fields:

| Field | Meaning |
|---|---|
| `id` | `fact_` + lowercase words, never changed once used (pages cite it as `[[fact:id]]`) |
| `topic` | one of `ramadan_dates`, `umrah_season`, `visa`, `health`, `hajj_process`, `hajj_cost`, `prices`, `flights`, `agency_rules`, `fraud_cases`, `school_calendar`, `wikitours`, `offers`, `local_casablanca`, `other` |
| `claim_fr` | the fact in one or two French sentences, as you checked it (`claim_ar`, `claim_en` optional: the same fact written natively in Arabic / English, helpful for Arabic and English posts) |
| `values` | every number the claim contains, as text without spaces (`"63021"`, `"2027"`). A page may only use these numbers. |
| `unit` | `MAD`, `days`… or `null` |
| `source_urls` | the page(s) where you checked it |
| `source_tier` | `official`, `media`, `airline`, `company_stated`, `own_data` or `academic` |
| `confidence` | `verified`, `likely` or `estimate`; the last two need `required_wording` |
| `required_wording` | words that must appear in the same sentence, e.g. « selon Gulf News » |
| `required_wording_ar`, `required_wording_en` | the same wording, written natively in Arabic / English. Without it, the fact cannot be cited on Arabic / English pages. For the facts of `registry.json` they live in `data/facts/i18n/registry-overlay.json` (with `claim_ar` / `claim_en`), merged at build |
| `status` | `approved` (usable), `proposed` (waiting), `expired`, `disputed`, `retired` |
| `verified_by` | who checked it. Today: `desk-research-2026-10-20`; put a real name when a person re-checks it |
| `verified_at` | the day it was checked (`YYYY-MM-DD`); shown on pages as « consulté le » |
| `review_by` | the day it must be checked again: 30 days for Saudi rules and prices, until the announcement for Hijri estimates, 180 days for company facts |
| `valid_until` | the day it stops being true (e.g. end of a season), or `null` |
| `time_critical` | `true` for facts that can change any day (deadlines) |
| `conflicts`, `supersedes` | other values found in other sources (`{ value, source_url }`, or `{ value, source }` when the URL is not known), which pages may not use as the fact; the id of the fact it replaces |

Visa, health and Hajj-procedure rules need at least one fact with `source_tier: official` (Nusuk, haj.gov.sa,
habous.gov.ma…) before a page can state them. Today `health` and `hajj_process` have none, so topics such as the
ACWY vaccine wait until an official source is added.

**Religious texts** (Qur'an, hadith, du'a, talbiya) are never written by the AI. They appear only from
`data/facts/kb/` (one file per text, approved by a named religious reviewer listed in `config/authors.json`).
Until that folder has approved entries, ritual topics (ihram, tawaf, sa'y, prayers…) wait.

Renewing = check the source again, then update `verified_at`, `review_by` (and `verified_by`). Never change a date
without checking the source. After editing, the `ci` workflow (or `npm test`) validates the file.

## 8. Topics

Each site's plan is `content/<domain>/topics.json`. Every topic has a `lang` (`fr`, `ar` or `en`). The weekly planner
keeps about 30 days of topics per site and language, proposing each language's topics from how people search in that
language (not from the French plan), and the generator writes each post natively in its language. It only proposes topics inside the site's charter (`config/charters.json`), never a topic reserved for
wikitours.ma, and never a topic, keyword or concept that another site already owns. You may edit the file by hand.

Topic `status`: `queued` (waiting), `done` (written; `file` says where), `failed` (rejected twice by the gates; the
reasons are in `last_errors` and `data/state/failures.jsonl`; fix the topic and set it back to `queued` if you want
it), `blocked` (waits for a missing fact; it returns to `queued` when the fact is approved).

Semrush exports dropped in `data/semrush/raw/` (file names as in `docs/strategy/SEMRUSH-BRIEF.md`) are read by the
weekly run into `data/keywords/registry.json`. Missing volumes stay empty; nothing is guessed.

## 9. Costs

**The real cost is UNKNOWN until it is measured** on the first weeks of posts. What exists:

- `data/state/spend.json`: for each month, the number of Claude calls, the tokens used (input, output, cache) and
  `usd_estimate`, also split `by_purpose` (`generate`, `verify`, `plan`) and `by_site`. The weekly report shows the month's
  total and the cost per post.
- The estimate uses the prices in `config/cadence.json → claude.price_usd_per_mtok`. They are **placeholders**:
  replace them with the current price of the model set in `CLAUDE_MODEL` (Anthropic pricing page). The invoice in the
  Claude Console is the real figure; compare the two after the first month.
- `monthly_spend_cap_usd` (today **150, a placeholder chosen by the builder, not by you**): when the month's estimate
  reaches it, writing stops until the next month. At 80 % the report and `monitor` show an alert. Set your own figure.
- Each post costs two Claude calls (the draft, then the claims verifier that checks every claim against the facts),
  up to four when the first draft is rejected. Planning costs one call per site and language per week when the
  queue is short.
- GitHub Actions minutes and Cloudflare Pages usage depend on your plans; check both pricing pages.

## 10. When something goes wrong

| You see | What it means / what to do |
|---|---|
| `generate: skipped: ANTHROPIC_API_KEY and CLAUDE_MODEL not set` | Add the secret and the variable (2.2). |
| `generate stopped: Claude API 404: is CLAUDE_MODEL a valid model id?` | Fix the `CLAUDE_MODEL` variable. |
| `launch_date is not set` in the daily log | Normal before launch (section 3). |
| `no eligible queued topic` | The site has no usable topic: wait for the weekly planner, approve the missing facts, or add topics. |
| `Gate errors: <site> not written` / `publish: gate errors block <site>` | Something in that site's content breaks a rule; the log names the file. That site is not deployed until it is fixed (its live version stays); the other sites are deployed. |
| `deploy failed` | The previous version stays online. Check the Cloudflare token and that the project exists (2.3). |
| A site is RED in the report | Read the reason. Dead-man switch: close the weekly issue. Maintenance mode: renew facts. |

## 11. Handover and rollback

- **Roll back a site**: Cloudflare dashboard → Workers & Pages → the project → **Deployments** → pick the last good
  deployment → **Rollback to this deployment**. Then fix or retire the content in the repository, or the next daily
  run deploys it again.
- **Second admin**: give a second trusted person admin access to the GitHub repository, the Cloudflare account,
  the Claude Console and Search Console, so the network does not depend on one person.
- **Two-factor authentication** on all four accounts. Keep the recovery codes offline.
- The `wrangler` version used for deploys is pinned in `scripts/publish.js` (`WRANGLER`); update it on purpose.

To test locally (needs Node 22): `npm ci`, then `npm test`, `npm run check`, `npm run build`, and
`node scripts/generate.js --dry-run --limit 1` (prints a brief, no AI call, writes nothing).
