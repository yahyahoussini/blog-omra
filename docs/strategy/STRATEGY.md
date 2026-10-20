# Omra Network Strategy — serving wikitours.ma

> **Client decisions (2026-10-20) override parts of this document — read [`DECISIONS.md`](DECISIONS.md) first.** In short: all 8 sites are built, 3 posts/day/site fully automated with a ramp and kill-switches, sister links up to 2 per post, wikitours.ma never touched.

> **Status & assumptions (read first)**
> - **Date:** 2026-10-20. Final strategy v1.1 (review fixes applied the same day).
> - **wikitours.ma is not yet audited.** We could not open its pages. Everything we know comes from Google's index (site: search on 2026-10-20). Real prices, offices outside Casablanca, team, reviews, Google Business Profile, backlinks, traffic and platform are **UNKNOWN**.
> - **Semrush data is pending.** Every keyword in this document is a **PLACEHOLDER**. There are no search volumes anywhere in this document, because we have none.
> - **ASSUMPTION (to confirm in D3): we have no access to wikitours.ma.** This is not in the client decisions we were given; it is our working assumption. We never edit wikitours.ma. Because it is the domain most likely to rank for Ramadan 2027, work on it is a **client-owned track with dates** (§4.6), not an optional extra.
> - **ASSUMPTION (to confirm in D3): you want full automation with about one weekly human check.** This is also not in the client decisions we were given (static HTML + CSS, Node.js, 10 keywords/site, 3 posts/day/site, cross-linking, Merchant Center). §16 says honestly why prose review needs more human time than that: about 2 h/week from you, plus a part-time editor to go beyond 3-4 posts a week.
> - **Plan date:** Wave 1 on **9-15 Nov 2026**, only if the written P0 checklist (§2.6) is complete by **Fri 30 Oct**. Otherwise it moves week by week.
> - All code is JavaScript (Node.js). Sites are static HTML + CSS.

**Labels used in this document**

| Label | Meaning |
|---|---|
| **VERIFIED** / [V] | Confirmed by an official source or by several sources that agree |
| **LIKELY** / [L] | Documented, but from one secondary source or not re-checked today |
| **UNVERIFIED** / [U] | Weak or single source, conflicting sources, or a pattern that may not repeat |
| **UNKNOWN** | No data |
| **ESTIMATE** / [E] | Hijri date (depends on moon sighting) or our own calculation |
| **DESIGN CHOICE** | A threshold or rule we recommend. It is not a Google rule. Tune it on real data |
| **PLACEHOLDER** | Example keyword. Replace with Semrush data |
| **NOT RESEARCHED** | We did not research this topic. A specialist must check it |

---

## 1. Executive summary

### 1.1 The model in six lines

1. **5 active .ma satellites + 3 held (redirecting).** Each active site is a useful Moroccan publication on its own, with one job: guide, Ramadan planner, agency verification, price observatory, trip logistics. On hold: offers board, Rabat departures, Casablanca departures (doorway risk, §5.6).
2. **Ownership is disclosed on every site:** "Publié par Wiki Tours International". No hidden network.
3. **Demand goes to Wiki Tours in two ways:**
   - **Mainly:** a WhatsApp click-to-chat button to the Wiki Tours number, with a pre-filled message that carries a reference code (site + page). We measure conversions without any access to wikitours.ma.
   - **Secondly:** at most one contextual link per post to a stable wikitours.ma / Bab Makka page that exists in the right language, `nofollow` by default (§3.5).
4. **A JavaScript engine (GitHub Actions + Claude API) runs the pipeline:** Semrush keywords → registry → briefs → drafts → automatic checks → weekly approval queue → publish. **The generator may only use facts from a human-approved facts registry.** No fact outside the registry gets published.
5. **Automatic kill-switches** cut or stop publishing when indexing, impressions, duplicate similarity or a manual action turn bad. A **dead-man switch** slows the network if the weekly review is skipped.
6. **Your time: about 2 h/week on average (ESTIMATE).** That is a 75-90-minute weekly review from a one-page report, a 5-minute phone approval when an official announcement happens (the "fast lane"), and monthly or quarterly tasks (§16.4). Going beyond 3-4 fully reviewed prose posts a week needs a **part-time Moroccan editor (≈ 5-6 h/week, E3)**.

### 1.2 What wins in this market

| Lever | Why it wins (evidence) |
|---|---|
| **Own dated data** (prices, offers) | In a limited, US-biased search on 2026-10-20 we found no published Ramadan 2027 omra prices. Agency sites and google.ma results were not checked (Semrush brief Step 7, now P0). The only comparison found (wafir.ma, summer 2026) is commercial and contradicts the official Saudi calendar inside the same page [U] ([wafir.ma](https://wafir.ma/fr/guide/omra-ete-2026-maroc-12-agences-comparatif-prix-financement)). A dated price table with a public method is something journalists and AI answers can cite. |
| **Fastest correct update** on official moments | Hajj registration moved earlier each cycle: 1447H on 13-24 Jan 2025, 1448H on 8-19 Dec 2025 [V] ([Medias24](https://medias24.com/2025/06/16/hajj-2026-le-tirage-au-sort-aura-lieu-du-23-juin-au-04-juillet-2025/), [Hespress](https://fr.hespress.com/451603-linscription-electronique-des-candidats-au-hajj-1448-h-du-8-au-19-decembre-2025.html)). No 1449H/2028 announcement found on 2026-10-20; it could come around Nov-Dec 2026 [U]. Other moments: Ramadan moon sighting, Hajj final cost, Saudi rule changes. |
| **Trust** | Omra fraud is national news: Feb 2026 Marrakech case (about 3.8M MAD) and a national consumer-observatory warning [V] ([Hespress](https://fr.hespress.com/462180-omra-lobservatoire-du-consommateur-appelle-a-un-controle-renforce-des-agences.html)); KSAR TOURS left pilgrims stranded while unlicensed [V] ([H24info](https://h24info.ma/?p=985412)). "How to verify an agency" content helps users and makes a disclosed, licensed agency more credible. |
| **Real deadlines** | Saudi 1448H Umrah season: last visa issued 9 Mar 2027, last entry 23 Mar 2027, last departure 7 Apr 2027 [V] ([haj.gov.sa](https://haj.gov.sa/en/Media-Center/Ministry-News/2026/Ministry-of-Hajj-and-Umrah-Announces-the-Umrah-Season-Calendar-for-1448-AH)). An unused Umrah visa expires 30 days after issue [L] ([Gulf News](https://gulfnews.com/world/gulf/saudi/saudi-arabia-announces-new-amendments-to-umrah-visa-rules-1.500328262)). So Ramadan decisions happen **now, Nov 2026 to Jan 2027**. |
| **One tap to a human** | **HYPOTHESIS (UNVERIFIED):** WhatsApp click-to-chat with a pre-filled message is the most natural call to action in Morocco. We have no platform-level usage data; DataReportal gives only headline figures (35.5 million internet users, 22.8 million social media user identities) [V] ([DataReportal](https://datareportal.com/reports/digital-2026-morocco)). The ref-code data will test it. Scammers use the same channels, so every social or WhatsApp touch should point back to a verifiable page first. |

**What we do not know about competitors.** Our competitor research ran only 5 of about 20 planned searches, on a US-only search tool. No Moroccan agency competitor is named in this plan, and none should be guessed. The manual google.ma check (Semrush brief Step 7) and Semrush Organic Competitors for wikitours.ma (R2) are therefore **P0**.

### 1.3 Top risks

| # | Risk | Why it applies here |
|---|---|---|
| 1 | **Doorway abuse** | Google's first doorway example is "multiple domain names or pages targeted at specific regions or cities that funnel users to one page" ([Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). omracasablanca.ma + omrarabat.ma match it almost word for word if they only funnel. The keyword-variant domains match "multiple websites with slight variations to the URL". Bing has a parallel "inorganic site structure" penalty ([Bing](https://blogs.bing.com/webmaster/2019/11/Some-Thoughts-on-Website-Boundaries/)). |
| 2 | **Scaled content abuse** | A named example is "creating multiple sites with the intent of hiding the scaled nature of the content" ([Google](https://developers.google.com/search/docs/essentials/spam-policies)). On 1 Oct 2026 Google said it is critical to manually fact-check all AI content before publishing, including titles, meta descriptions, structured data and alt text [L] ([PPC Land](https://ppc.land/google-tells-sites-to-manually-factcheck-all-ai-content-before-publishing/)). **Full automation with a weekly check is the highest-risk setup under this policy.** |
| 3 | **Link scheme** | Sitewide footer link blocks and partner pages "exclusively for the sake of cross-linking" are named link spam ([Google](https://developers.google.com/search/docs/essentials/spam-policies)). A network link pattern could also hurt wikitours.ma, which we cannot fix. |
| 4 | **A wrong fact** on a visa, price or Hajj rule | Pilgrims pay tens of thousands of MAD, and Saudi rules change. (Calling this "YMYL-adjacent" is our interpretation, not a Google label.) |
| 5 | **Undisclosed self-promotion** | A "neutral" agency ranking or price comparison that favours Wiki Tours without disclosure is a trust and legal liability. |

Context: Google ran four spam updates in 2026 (March, June, August, September) [L] ([Search Engine Land](https://searchengineland.com/google-september-2026-spam-update-done-rolling-out-493550)). Recovery from a hit typically takes months [L] ([GSQi](https://gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/)).

### 1.4 Partner verdict on your plan

| Your decision | My verdict | What I propose instead |
|---|---|---|
| 8 satellites, all live | **Partly** | **Wave 1 (plan date 9-15 Nov 2026, if the P0 checklist is complete by 30 Oct):** omra-ramadan, guideomra, agenceomra, **pillars first (≈ 20 FR pages)**. **Wave 2 (target early Dec):** voyageomra, and prixomra only when the first price survey reaches its threshold, the official licence-list URL is known and the lawyer has signed off (`legal_ok`). **Hold 3:** offresomra (301 to the Bab Makka page until you and a lawyer approve a multi-agency board), omrarabat (301 to voyageomra's Rabat-Salé section until a real Rabat presence or RBA departures are confirmed), omracasablanca (301 to voyageomra's CMN section; a city domain funnelling to one agency is Google's first doorway example, §5.6). Every 301 waits for a clean domain-history check (D6). |
| 3 posts/day/site (24/day) | **No, not as a target.** It stays only as a hard ceiling in the scheduler. | Start at what can be **fully** reviewed. **Owner only: ≈ 3-4 prose posts/week** plus data-table updates. **With a part-time Moroccan editor (≈ 5-6 h/week, a P0 condition for this level): L1 ≈ 12/week in Nov (Wave 1), ≈ 16/week from Dec, ceiling 25.** Move up only when objective quality criteria hold for 4 weeks (§7.2). Mueller has said posting frequency is not a ranking factor (it can raise crawling, not rankings) [L] ([SEJ](https://www.searchenginejournal.com/how-freshness-works/457485/)). |
| Strong cross-linking | **No to heavy cross-linking** | Contextual, capped, disclosed links: per post ≤ 1 link to wikitours.ma and ≤ 1 sister link, **all `nofollow` by default**. The value we want is leads and referral visits, so a followed link adds risk and nothing else. No sitewide footers. **0% exact-match commercial anchors** to wikitours.ma. |
| Full automation, weekly check (ASSUMPTION, D3) | **Yes for the machinery, no for prose** | **No prose goes live without a full human read** (weekly batch; the 5-minute fast lane only adds approved facts to existing tracker tables). If you skip the review, publishing stops. Only **data values** from human-verified records (table cells and fact-table rows on stable URLs) update automatically. No new prose page is ever auto-published. |
| Merchant Center 780069013 | **Freeze** | Travel packages are unsupported. Whether Morocco is a supported country is **UNKNOWN**. Check inside the account in week 1 before building any shop. |
| More domains | **Mostly no** | The bottleneck is verified facts and review time, not domains. Worth buying now: **brand-defence domains only** (Bab Makka and Wiki Tours variants), redirected only after a clean history check. A Hajj keyword domain is the same pattern as other keyword variants; revisit it only at the Jun 2027 audit under §17.3. Never city, year or keyword-variant domains. |
| "Rank FAST" | **Cannot be promised** | New .ma domains have no ranking signals, and Google gives no indexing timeline beyond "days to weeks" ([Google](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)). |

**Honest Ramadan 2027 expectation.** Ramadan starts in about 111 days (≈ 8 Feb 2027 by Umm al-Qura; ESTIMATE, [Wego](https://blog.wego.com/ramadan-2027/)).
- **Possible wins for Ramadan 2027 (ESTIMATE, no evidence yet):** long-tail informational queries; faster discovery on Bing (IndexNow only speeds Bing discovery; it does not deliver rankings or citations); perhaps some AI-answer citations; press pickup of our price data (UNKNOWN, §8.5); WhatsApp leads from sharing.
- **The domain most likely to rank by January is wikitours.ma itself** (established and indexed). That is why the money-site track (§4.6) is part of the plan.
- **Head terms such as "omra ramadan 2027":** ranking by January is UNKNOWN. Do not plan revenue on it.
- **Ramadan 2028 is the realistic season to compete for head terms.** We build for both.

**What must stay human:** weekly facts approval, a full read of every prose post before it is scheduled, same-day fast-lane approval of official announcements, the monthly price survey, real photos and consented testimonials, named-author sign-off on pillar pages, religious-text approval, and a one-time legal review.

---

## 2. Inputs needed from the client

Priority: **P0** blocks the Wave 1 launch. P0 inputs are needed by **Fri 30 Oct 2026** for the Wave 1 plan date of **9-15 Nov**. Launch happens only when a written P0 checklist is complete; each week of delay moves it by a week. Semrush R0 + R2 and the manual SERP check are P0 by **Wed 28 Oct**: they shape the topic map but do not block drafting the Wave 1 pillars. **P1** needed within 4 weeks (Wave 2). **P2** improves results later.

### 2.1 Wiki Tours facts (the base of trust and of the facts registry)

| # | Item | Why we need it | Prio |
|---|---|---|---|
| A1 | Exact legal name, company identifiers shown on invoices, Casablanca office address, opening hours, landline, email | Publisher page on every site. Organization schema. Must match Merchant Center if it is ever used (Misrepresentation policy, [Google](https://support.google.com/merchants/answer/6150127?hl=en)). | P0 |
| A2 | Licence ODV-25012: a copy of the licence, plus the link where it appears on the Ministry of Tourism's official list of authorised agencies | **Hard build blocker:** the licence number appears on our sites only after the ministry-list link is confirmed (§3.3, §10.3). Until then sites show legal name and address only. The ministry publishes an official list [V] ([H24info](https://h24info.ma/?p=985412)); its current URL is UNKNOWN. | P0 |
| A3 | Is Wiki Tours labelled for Omra 1448H? Is it on the agency list for Hajj? | Decides whether any "Hajj via agency" call to action is allowed. Agencies handled about 11,800 of 34,000 Hajj places in 1447H [L] ([Morocco World News](https://www.moroccoworldnews.com/2026/04/288023/morocco-sets-34000-pilgrims-quota-lower-costs-digital-upgrade-for-hajj-season/)). | P0 |
| A4 | Offices or staff outside Casablanca (Rabat in particular). Departures from Rabat-Salé (RBA) or other airports | Decides whether omrarabat.ma is ever built (§5.8). | P0 |
| A5 | WhatsApp Business number for leads, who answers it, hours, languages (FR/AR/Darija), and a promise that staff label chats by reference code | The main conversion path and the only attribution we control. | P0 |
| A6 | wikitours.ma URLs we may link to, by language (FR/AR/EN): Bab Makka, Ramadan 2027 program, Hajj, the three blog posts, contact. Plus a promise to tell us before any URL changes | We link only to pages that exist. Until a page exists, the CTA is WhatsApp only. Only /en/ URLs are known; FR/AR versions are UNVERIFIED. | P0 |
| A7 | Ramadan 2027 Bab Makka offers: dates, nights in Makkah/Madinah, hotels and real walking distance, room basis, real "from" prices, inclusions, payment schedule, refund policy, contract template, validity date. Then a weekly update | Satellites may only quote Wiki Tours prices from the facts registry. Seat or availability claims only from dated records. | P0, then weekly |
| A8 | Does Wiki Tours provide a group guide (mutawwif), Nusuk/Rawdah permit handling, pre-departure sessions? | "What an agency adds" content. We never claim a service you don't provide. | P1 |
| A9 | Google Business Profile URL for the real Casablanca office (if it exists) and social profile URLs | sameAs, entity consistency. Satellites never get their own profile ([GBP rules](https://support.google.com/business/answer/3038177?hl=en)). | P1 |

### 2.2 People and media (E-E-A-T, no deception)

| # | Item | Why | Prio |
|---|---|---|---|
| B1 | 2-4 real staff who agree to be named authors or reviewers: name, role, years of experience, photo, written consent. Include **one qualified religious reviewer** and **one Arabic-language reviewer** (Arabic pages never publish without the Arabic reviewer's full read) | Fake author profiles are explicitly deception in Google's guidance since 1 Oct 2026 [L] ([SER](https://seroundtable.com/google-warns-against-deceptive-authorship-information-42238.html)). Without real people, posts carry an organisation byline and ritual pillars wait. | P0 for pillars |
| B2 | Real photos with usage rights: office (outside with signage, inside), team, past groups (with consent), departure scenes at CMN, hotels you use | Original media and local substance. No AI images presented as real photos. | P1, then monthly |
| B3 | Real testimonials with written consent (text, first name, city, trip month) | Social proof. Never as review-star markup about yourself ([Google](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)). | P1 |
| B4 | Logos (Wiki Tours, Bab Makka), colours, naming rules | Publisher box. Each satellite still gets its own design. | P0 |

### 2.3 Data feeds

| # | Item | Why | Prio |
|---|---|---|---|
| C1 | Semrush exports per **SEMRUSH-BRIEF.md** (Morocco database if it exists: UNVERIFIED). R0 + R2 + the manual google.ma SERP check (Step 7) by **Wed 28 Oct**; the rest by **Sun 8 Nov** | Keyword registry; reserves the topics wikitours.ma already serves; names real competitors. Semrush can analyse any domain, so no wikitours.ma access is needed. | P0 (R0, R2, Step 7; does not block drafting Wave 1 pillars), P1 rest |
| C2 | Your 10 main keywords per site (file R0) | Your rule (§6.3) | P0 |
| C3 | **Monthly price survey owner** (staff member or assistant). Public offers only, each with URL + screenshot, captured by hand (also for social-media offers). Never pose as a customer | prixomra.ma cannot publish without it. Time per survey UNKNOWN; ESTIMATE 4-12 h for the 40+ offers the published table needs (§5.4), scaled from an earlier 2-8 h guess for 20-30 offers. Measure it on survey #1. | P1 (first survey 9-27 Nov) |
| C4 | Weekly lead sheet by reference code: date, outcome (chat / quote / booking), value band. **No names, no phone numbers** (≈ 5-15 min/week for staff, estimate) | The only true ROI measure. We cannot see wikitours.ma analytics. | P1 |
| C5 | Optional: anonymised top 5 WhatsApp questions per week | Real questions are the best answer-engine material. | P2 |
| C6 | Optional: wikitours.ma referral numbers from your own analytics (GA4 or other), monthly | Confirms link traffic. The plan works without it. | P2 |

### 2.4 Tool access

| # | Access | Why | Prio |
|---|---|---|---|
| D1 | Search Console: add our service account as a user on the 8 Domain properties, and **add wikitours.ma** as a Domain property in the same account (M1) | Daily data pulls, URL Inspection sampling, sitemap submission, kill-switches. wikitours.ma data is needed for cannibalisation checks and the money-site baseline. | P0 |
| D2 | Bing Webmaster Tools: import the 8 sites from Search Console ([Bing](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)) | Bing/Copilot index, AI Performance report. | P0 |
| D3 | Private GitHub repository in your organisation | Engine, cron, audit trail. A private repo also avoids the rule that scheduled workflows in public repos are disabled after 60 days without activity [L] ([GitHub docs](https://docs.github.com/en/enterprise-server@3.7/actions/using-workflows/disabling-and-enabling-a-workflow), Enterprise Server copy; github.com page not re-checked). | P0 |
| D4 | Cloudflare account (8 zones, Pages, R2), DNS for the 8 domains pointed to Cloudflare | Hosting. Cloudflare blocks AI crawlers by default on new domains since 1 Jul 2025 ([MIT Technology Review](https://www.technologyreview.com/2025/07/01/1119498/cloudflare-will-now-by-default-block-ai-bots-from-crawling-its-clients-websites/)); we must allow the search bots. | P0 |
| D5 | Claude API key in your organisation, with a **monthly spend cap you set** | Drafting and verification. Cost per post UNKNOWN until we measure the first 2 weeks. | P0 |
| D6 | Domain registrar access and the registration history of the 8 domains (purchase date, previous owner) | Expired-domain-abuse check ([Google](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)). Also confirm with your registrar that the registrant data and documents on all 8 .ma domains are correct (.ma registration terms are NOT RESEARCHED). **Every 301 (held sites, brand domains) waits for this check.** | P0 |
| D7 | Semrush plan level (project limit, export rows, API units if any) | Position Tracking needs 6 projects (5 active sites + wikitours.ma; up to 9 only if held sites relaunch); plan limits UNVERIFIED. SERP-overlap clustering needs licensed SERP data (scraping Google breaks its terms, [Google ToS](https://policies.google.com/terms)). | P1 |
| D8 | Merchant Center 780069013: standard access + a screenshot showing whether Morocco is selectable as a target country, and whether a website is already claimed | Decides whether a shop exists at all (§10.9). One claimed website per account [L] ([Google](https://support.google.com/merchants/answer/14089347?hl=en)). | P2 (check in W1) |

### 2.5 Legal and time

| # | Item | Why | Prio |
|---|---|---|---|
| E1 | One-time review by a Moroccan lawyer. Laws to check (names given for the lawyer; their texts are **NOT RESEARCHED** here): (1) **Loi 31-08** on consumer protection, including any rules on comparative and misleading advertising (price observatory, comparisons, a CTA next to competitor prices); (2) **Loi 09-08** and the **CNDP** on personal data (WhatsApp chats, lead sheet, optional webhook; whether a declaration or authorisation is needed is UNVERIFIED); (3) **Law 11-16** on travel agencies, its rules on advertising and online/distance sales [L] ([EcoActu](https://ecoactu.ma/?p=17467)); (4) defamation and unfair-competition exposure in fraud content and when naming agencies; (5) reuse terms of the ministry list; (6) disclosure wording | Coded **`legal_ok` gate** (§5.4): the build refuses prixomra, any comparison page and any agenceomra page naming an agency until config holds a lawyer sign-off date. | P1 (before Wave 2); P0 for offresomra |
| E2 | Your time (ESTIMATE): Wave 1 pillars ≈ 5-7 h of review; all ≈ 64 launch pages ≈ 16-21 h of named-reviewer time at 15-20 min/page (religious and Arabic reviewer time is separate, §16.4); then ≈ 2 h/week on average + fast-lane approvals | Every prose page gets a full human read. | P0 |
| E3 | A **part-time Moroccan editor** (FR, ideally also AR), ≈ 5-6 h/week, who fully reads and signs prose posts | At ≈ 15 min/post (ESTIMATE), you alone can fully review only ≈ 3-4 prose posts a week. The editor is the condition for L1 (≈ 12-16 posts/week). Cost UNKNOWN. | P0 for L1; without it the network stays at owner-only volume |

### 2.6 Written P0 checklist (go / no-go on Fri 6 Nov for the 9-15 Nov plan date)

- [ ] A1 legal identity and Casablanca address; A3 Omra/Hajj labelling answer; A5 WhatsApp number and who answers it; A6 link targets; A7 Ramadan 2027 offer data (or WhatsApp-only CTAs until it exists).
- [ ] A2 licence proof, **or** the licence stays hidden at launch (legal name and address only).
- [ ] B1: at least one named reviewer, plus the Arabic reviewer before any AR page and the religious reviewer before any ritual page; B4 logos.
- [ ] C1: Semrush R0 + R2 + manual SERP check received (Wed 28 Oct).
- [ ] D1-D6 access done, including wikitours.ma in Search Console (M1) and the domain-history results.
- [ ] E3 editor in place, **or** written acceptance of owner-only volume (≈ 3-4 prose posts/week).
- [ ] Decisions D1-D5 and D19 answered (or defaults accepted in writing).
- [ ] Engine MVP passes its tests; facts gate calibrated on 20 real drafts.

---

## 3. Network model & compliance architecture

### 3.1 One test above every rule

> **Would this site, page or link still exist if search engines didn't?** If the honest answer is no, we don't build it.

This follows Google's doorway self-test: is the page's purpose to rank and funnel? Does it duplicate a location grouping to grab traffic? Is it an "island"? ([Google 2015](https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages)). A site that fails gets a 301 to its best match. A redirect is not a doorway.

### 3.2 How the satellites serve wikitours.ma without doorway patterns

| Rule | In practice |
|---|---|
| One distinct job per site | Each site has a written **charter**: audience, job, owned intents, banned intents, unique data asset (§5). No two sites, and no site and wikitours.ma, target the same **concept** in any language (§6.5: one `concept_id` shared across FR/AR/EN). |
| Standalone usefulness | A reader who never contacts Wiki Tours still gets a complete, sourced answer. The call to action comes **after** the answer. |
| No city-swapped copies | omracasablanca.ma and omrarabat.ma stay on hold (301 to voyageomra's airport sections). Mueller called keyword + city landing pages doorways [L] ([SER](https://www.seroundtable.com/google-city-landing-pages-doorway-pages-28670.html)). |
| Distinct design and structure | Each site has its own theme, information architecture and page types. One codebase is fine; one template recoloured eight times is not. Trust pages are written per site charter, section labels and their order vary per theme, and the duplicate gate runs on every page (trust pages included, minus the one-line ownership footer). |
| Volume capped by value | Cadence ladder (§7.2). When unique clusters run out, the generator idles instead of padding. |
| Consolidation is a valid outcome | "If you make 2 websites out of one, you're not going to be twice as visible in search" (Mueller) [L] ([SER](https://seroundtable.com/google-two-for-one-27618.html)). A ready consolidation plan exists (§14.3). |

### 3.3 Ownership disclosure: decision = DISCLOSE on every site

**Why:**
- The sites are easy to connect anyway (shared publisher, WhatsApp number, design patterns). Whether Google uses signals such as a shared Search Console account is UNKNOWN; the argument does not rely on it.
- Hiding scale is the named scaled-content example.
- In a market with a fraud problem, openness is a selling point.
- Mueller (Jan 2026) said sister brand sites linking from a shared brand page is common and fine at reasonable scale [L; quote known only via a secondary report, UNVERIFIED as wording] ([SER](https://www.seroundtable.com/google-linking-brand-websites-40761.html)).

**How:**
- **Footer line on every page:** « Publié par Wiki Tours International, agence de voyages, Casablanca ». It links to the site's own `/editeur/` page, not to wikitours.ma.
- **`/editeur/` page on every site:** legal identity, licence **only once A2 is proven** (number + link to the ministry's official list; until then legal name and address only, and the build refuses to render it, §10.3; the same rule applies to « depuis 2016 »), office address, the site's job, how content is made, corrections policy, list of the network's sites (one line each, `nofollow`).
- **Disclosure box** above any mention of Wiki Tours or Bab Makka and on every comparison, offer list or price table. Example wording: « Wiki Tours International, l'éditeur de ce site, est une agence de voyages. Ses offres sont signalées comme telles. » Each site words it in its own way (same facts), so six domains do not repeat one paragraph.
- The WhatsApp button says who the reader contacts: « Parler à Wiki Tours (éditeur de ce site) ».

### 3.4 What each site must offer on its own

| Site | Standalone value | Fails the test if… |
|---|---|---|
| guideomra.ma | Sourced rituals, documents, health, permits, official calendars | It is generic filler or copies wikitours.ma topics |
| omra-ramadan.ma | A live Ramadan deadline table and season guide | It reposts guideomra pages with "Ramadan" added |
| agenceomra.ma | A neutral method to verify and choose a licensed agency | It ranks Wiki Tours first, or hides ownership |
| prixomra.ma | Dated price data with method and downloadable CSV | Ranges are invented or samples are too small |
| voyageomra.ma | Flights, airports, packing, heat and health on the road | It gives packing tips with no sources |
| omracasablanca.ma (hold) | Little that voyageomra (CMN section) and wikitours.ma (the office) do not already own | It funnels a city name to one agency; the default is a 301 (§5.6) |
| offresomra.ma (hold) | Current, dated offers from **several** licensed agencies | It lists only Wiki Tours (then it is an ad and a doorway) |
| omrarabat.ma (hold) | Real RBA departure logistics, with a real Rabat presence | It pretends to be a Rabat agency |

### 3.5 Rules for linking to wikitours.ma (DESIGN CHOICES, enforced by gates)

| Parameter | Rule |
|---|---|
| Count | **≤ 1** in-body contextual link per post. Many posts have none. |
| Share of posts with one | guideomra, voyageomra, agenceomra: **≤ 30%**. omra-ramadan: **≤ 60%**. prixomra: **≤ 20%**, never inside tables. omracasablanca (only if you override the hold): **≤ 20%**. Never forced. |
| Placement | In the body at the natural "next step" (booking, seeing a Bab Makka program), or in the end-of-article « Passer à l'action » box. Never in the first sentence, never in sitewide navigation or footer. |
| rel, every satellite → wikitours.ma link (editorial sites included) | **`rel="nofollow"` by default** (`moneyLinkRel = "nofollow"`). The value we want is leads and referral visits; a followed link adds nothing to that and adds risk to the one asset we cannot inspect or repair. Revisit only after 6 months of clean Search Console data on wikitours.ma (once you add it, M1). Listing / comparison sites (prixomra, offresomra, agenceomra) stay `nofollow` permanently. |
| Sister links (satellite ↔ satellite) | **≤ 1 per post, `nofollow` by default, contextual only.** From launch: per site per month, ≤ 25% of posts link to any one sister, and ≤ 3 links per sister pair per week; reciprocal page pairs (A→B and B→A between the same two pages) are blocked. Bing treats "one site split across cross-linked domains" as a PBN [V] ([Bing](https://blogs.bing.com/webmaster/2019/11/Some-Thoughts-on-Website-Boundaries/)). |
| rel, repeated elements (header button, network list on `/editeur/`, CTA boxes) | **`rel="nofollow"`**. "Widely distributed links in the footers or templates of various sites" are unnatural-link examples [L] ([Ahrefs summary](https://ahrefs.com/seo/glossary/link-spam)). |
| WhatsApp links | Go through `/go/wa/…`, `rel="nofollow"`, `/go/` disallowed in robots.txt. |
| Anchor mix (per site, rolling 90 days) | Brand / navigational ("Wiki Tours", "Bab Makka", "wikitours.ma") **≥ 60%**. Descriptive ("les programmes Omra Ramadan de Wiki Tours") **≤ 40%**. **Exact-match commercial ("prix omra ramadan", "omra pas cher"): 0%.** No single anchor > 20% of links to one target. |
| Target validity | Every target must be on the A6 list. A weekly read-only check confirms each returns 200. A broken link is removed at the next build; the WhatsApp button stays; you get an alert. |
| Language | FR pages link to FR targets, AR pages to AR targets. If none exists: link the EN page labelled « (page en anglais) », or use WhatsApp only. |
| Switch | The config flag `moneyLinkRel` already defaults to `nofollow`. Moving it to `follow` needs your written decision after the 6-month review; moving back is one build. |
| hreflang / canonical | **Never** across domains (satellite ↔ wikitours.ma). |

### 3.6 Never-do list

1. City or keyword-variant pages or domains that only swap words and push users to one booking page.
2. Sitewide footer or template blocks linking all sister sites; partner pages built only to cross-link; link exchanges; bought links; automated link creation; hidden links or text.
3. Spinning one article into variants across sites.
4. Publishing any number, date or rule that is not in the facts registry.
5. Fake authors, AI headshots, invented credentials, AI listed as the author ([Google](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)).
6. Fake, incentivised or self-serving reviews; review-star markup about Wiki Tours.
7. A "neutral" ranking with Wiki Tours first and no stated criterion and disclosure.
8. A Google Business Profile for a satellite, a virtual office, or a Rabat office that does not exist.
9. Event markup for trips ([Google](https://developers.google.com/search/docs/appearance/structured-data/event)); HowTo markup for rich results (deprecated).
10. Google's Indexing API for posts (JobPosting / BroadcastEvent only) ([Google](https://developers.google.com/search/apis/indexing-api/v3/using-api)).
11. Hidden instructions for AI models (prompt injection is a Bing abuse category [L], [SEJ](https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442)); cloaking; back-button hijacking scripts, including from third-party libraries ([Google](https://developers.google.com/search/blog/2026/04/back-button-hijacking)).
12. Bumping "2026" to "2027" in titles without real content changes.
13. "Visa garanti", "prix garanti", "مضمون", "0% d'intérêt", resetting countdown timers, invented "places restantes".
14. Copying the look of the Ministry, Nusuk or Saudi portals.
15. **Redirecting a penalised satellite to wikitours.ma.** Whether problems transfer is UNKNOWN; we never test it on the money site.
16. Any change to wikitours.ma made by us. Changes there are client-owned (§4.6).

---

## 4. Entity & brand architecture

### 4.1 Entity graph

```
Wiki Tours International  (Organization; Casablanca; "since 2016" and licence ODV-25012 as stated by the site; shown on satellites only after official proof)
 ├─ wikitours.ma  (official website, the money site; client-owned track §4.6, we never edit it)
 │    └─ Bab Makka  (Brand: premium Umrah & Hajj service)
 ├─ Casablanca office  (the only local entity; its GBP is owned by the client)
 ├─ real named staff  (authors / reviewers)
 └─ publisher of: guideomra.ma · omra-ramadan.ma · agenceomra.ma · prixomra.ma · voyageomra.ma
                  [offresomra.ma · omrarabat.ma · omracasablanca.ma: on hold, redirecting]
```

- Each satellite is a `WebSite` with a human site name that names the publisher, e.g. « Guide Omra · par Wiki Tours », « Omra Ramadan · par Wiki Tours ».
- One shared Organization `@id` (`https://wikitours.ma/#org`) is referenced as `publisher` everywhere. We use it as an identifier only; we never edit wikitours.ma.
- Naming is identical everywhere: "Wiki Tours International", "Bab Makka". No variants.

### 4.2 Topic split: wikitours.ma vs satellites

| Topic / intent | Owner | What satellites do |
|---|---|---|
| Brand / navigational: Wiki Tours, Bab Makka, "avis Wiki Tours" | wikitours.ma | Never target these. Mention the brand only with disclosure. |
| Book Omra/Hajj programs; Bab Makka prices | wikitours.ma | WhatsApp CTA + ≤ 1 contextual link |
| Omra tiers économique → VIP (`/en/blog/gammes-omra-economique-vip`) | wikitours.ma | prixomra uses tiers only as table dimensions and links to the tier guide. No satellite "gammes omra" guide. |
| Hajj registration **via an agency** and agency quota (`/en/blog/hajj-maroc-inscription-quota`) | wikitours.ma | No satellite targets "inscription hajj agence" or "quota agences". |
| **Official Hajj 1449H timeline** (dates, eligibility, lottery, official cost line, official links from habous.gov.ma) | guideomra.ma | A distinct intent on paper (official calendar, not agency registration), but Google may show one SERP for both (UNVERIFIED, untested). **Before D1 is final:** a licensed SERP-overlap check (FR and AR) of guideomra's Hajj-timeline keywords vs the wikitours.ma post's keywords (from R2). If overlap is ≥ 4/10, guideomra publishes only a dated official-facts table with no « inscription » in title or H1. It always links to the wikitours.ma post for "inscription via une agence" and to prixomra for cost history. |
| Madinah ziyara (`/en/blog/que-visiter-medine-ziyara`) | wikitours.ma | No satellite sightseeing guide. guideomra covers only the Rawdah permit (a rule) and links to the ziyara post. |
| Local transactional ("agence omra casablanca") | wikitours.ma + the client's own GBP | No satellite targets it. omracasablanca.ma is on hold; CMN logistics live on voyageomra. |
| Group trips (Istanbul, Thailand, Bali) | wikitours.ma | Out of scope |
| Rituals, documents, health, Nusuk, Hajj preparation and rituals | guideomra.ma | |
| Ramadan dates, deadlines, last 10 nights | omra-ramadan.ma | |
| Verifying / choosing a licensed agency | agenceomra.ma | |
| Market price data; official Hajj cost history | prixomra.ma | |
| Flights, airports, packing, heat, logistics | voyageomra.ma | |
| CMN and RBA departures | voyageomra.ma (airport sections) | The office itself lives on `/editeur/` pages and wikitours.ma |

**Reserved clusters are language-agnostic.** Every registry cluster carries a `concept_id` shared across FR/AR/EN. A reserved concept is blocked on every satellite in every language, even though all known wikitours.ma URLs are /en/. Any keyword that contains a reserved concept token (hajj + inscription/agence/quota; casablanca + agence/omra) stays `unassigned` until a SERP-overlap result or a manual decision is recorded.

**When a wikitours.ma post goes out of date** (e.g. habous.gov.ma announces the 1449H cycle and the registration post still describes 1448H), the system sends **an automatic alert to you** with the change and the source. It does **not** let a satellite publish a competing page on that intent.

### 4.3 Schema (JSON-LD, generated at build)

| Type | Where | Notes |
|---|---|---|
| `Organization` (publisher, `@id` `https://wikitours.ma/#org`) | Every page | Real name, logo, real address (A1), `sameAs` only for profiles you confirm. **Organization, not TravelAgency, on satellites.** |
| `WebSite` | Every site home | `publisher` → the Organization `@id` |
| `BreadcrumbList` | Every page | Supported rich result **on desktop only** ([gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)). Since 23 Jan 2025 Google shows only the domain on mobile results [V] ([Google](https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs)), so the benefit is small for a mobile-first audience. Still useful for site structure. |
| `BlogPosting` + `Person` author with `author.url` → bio page (`ProfilePage`) | Posts with a real author | ([Google Article docs](https://developers.google.com/search/docs/appearance/structured-data/article)) |
| `BlogPosting` with Organization author | Posts without a real signing author | Honest byline (§4.5) |
| `Dataset` | prixomra data pages | Semantic only; no rich result claimed |
| `FAQPage` | Optional | FAQ rich results no longer shown: reported gone from 7 May 2026, Search Console support removed June 2026, per SEJ [L] ([SEJ](https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/)). Our earlier brief dated Google's removal announcement to June 2026; the dates differ between reports, and we found no Google announcement in this research. Valid schema.org, semantic only. |
| `TouristTrip` / `Offer` | offresomra (if launched) | Semantic only; Google consumption UNVERIFIED |
| `Product` + `Offer` | Only if a shop is ever approved | Must match the feed |
| **LocalBusiness / TravelAgency** | **Never on a satellite** | The single local entity stays with wikitours.ma and the real Casablanca GBP. |
| Event for trips; HowTo; self-serving Review / AggregateRating | **Never** | |

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://wikitours.ma/#org",
      "name": "Wiki Tours International", "url": "https://wikitours.ma/",
      "address": { "@type": "PostalAddress", "addressLocality": "Casablanca", "addressCountry": "MA",
                   "streetAddress": "<from client input A1 — never invented>" },
      "sameAs": ["<only profiles the client confirms (A9)>"] },
    { "@type": "Brand", "@id": "https://wikitours.ma/#bab-makka", "name": "Bab Makka" },
    { "@type": "WebSite", "@id": "https://guideomra.ma/#website", "url": "https://guideomra.ma/",
      "name": "Guide Omra", "alternateName": "Guide Omra par Wiki Tours",
      "inLanguage": ["fr-MA", "ar-MA"], "publisher": { "@id": "https://wikitours.ma/#org" } }
  ]
}
```

### 4.4 Off-site entity signals (no wikitours.ma access needed)

- **The same NAP everywhere** (name, address, phone): `/editeur/` pages, the client's GBP, social profiles, the ministry's official list.
- **The ministry list:** make sure Wiki Tours is listed correctly (A2).
- **Press mentions from our data stories** (§8.5). In our view (not a Google statement), these are likely among the most useful independent signals for Google and AI engines to learn who Wiki Tours is.
- **Wikidata:** only if independent sources exist (eligibility UNVERIFIED). Never a promotional Wikipedia page.
- **Real staff profiles** (e.g. LinkedIn, with consent) linked from author bio pages.
- **Entity prompts** in the monthly AI panel (§9.6): « Qui est Wiki Tours International ? », « Bab Makka omra avis ». We log whether the answers are correct.

### 4.5 Real authors and E-E-A-T: byline policy

| Tier | Content | Byline | Disclosure line |
|---|---|---|---|
| **A** | Pillars, rule explainers (visa, Hajj, health), comparisons, anything about Wiki Tours, ritual pages | Real named author + real named reviewer, with dates | « Relu par [nom], [rôle], le [date] » |
| **B** | Data pages (offers, price snapshots, fact tables) | « Données : [site] / Wiki Tours International » | « Généré à partir de [jeu de données], données du [date] » |
| **C** | AI-assisted supporting posts (each fully read before publishing) | **Organisation only**: « Wiki Tours International ». Never a per-site desk name (no « Rédaction Guide Omra »), never a person who did not review the page | Say exactly what happened: « Rédigé avec un outil d'IA. Faits issus de notre registre, vérifiés par [nom] le [date] ; page relue par [nom] le [date]. » The second clause appears **only** when that person fully read the page. |

- Google advises disclosure where readers would reasonably ask, and not listing AI as author ([Google](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)).
- **`reviewed_by` means a full read.** The front-matter schema accepts `reviewed_by` only with `full_read: true`. A structured check (title, short answer, claims table) never schedules prose; skimmed items wait a week.
- A "Comment nous produisons nos contenus" page per site: AI-assisted drafting, facts registry, reviewer names, corrections policy.
- **Religious content:** no generated rulings. Qur'an verses, hadith and du'a come only from an approved knowledge base (§7.4 gate 4). Ritual pillars are signed by the religious reviewer. Qur'anic text is rendered as text with its reference, never as decoration.

### 4.6 Money-site track: wikitours.ma (client-owned, with dates)

Everything exists to serve wikitours.ma, and it is the established, indexed domain: the one most likely to rank for Ramadan 2027 (new satellites are unlikely to win head terms by January, §1.4). So this track is **part of the plan, not optional**. We never edit wikitours.ma; you (or your web provider) own these items. Baseline = its Search Console data on the day the property is added.

| # | Action | Owner | Date | How we measure |
|---|---|---|---|---|
| M1 | Add wikitours.ma as a Domain property in the same Search Console account, import it into Bing Webmaster Tools, give our service account read access | C | **Fri 30 Oct (P0)** | Property verified; baseline export (indexed pages, queries, languages) |
| M2 | **FR (and AR if Semrush or Search Console show demand) Ramadan 2027 Bab Makka page** with real dates, inclusions, hotel distance, "from" prices only if real. Send the URL (A6) | C + WT | **Sun 15 Nov** | URL live and indexed (URL Inspection). Satellite Ramadan CTAs point to it; until it exists they use WhatsApp only |
| M3 | « Vérifiez-nous » page: licence ODV-25012 linked to the ministry's official list, legal entity, office address, payment methods, contract template, refund policy, named staff | C | With A2 proof (target end Nov) | Page live; the licence link resolves to the official list |
| M4 | Organization / TravelAgency JSON-LD with `@id: https://wikitours.ma/#org` (matches the satellites' publisher node), real address, logo, `sameAs` | C | End Nov | Rich Results Test passes |
| M5 | Homepage title "Umrah 2026 from Morocco": change the year **only** together with a real content update (programs, prices, dates). Date-only freshening is discouraged by Google | C | With M2 | Title and content updated together |
| M6 | Keep the Hajj registration/quota post current when habous.gov.ma announces the next cycle (our watcher alerts you) | C | Same week as the announcement | Post updated; alert closed |
| M7 | Self-referencing canonicals on all pages (needed before UTMs, §11.6); hreflang between FR/AR/EN versions if they exist | C | End Nov | Semrush Site Audit / Search Console |
| M8 | Google Business Profile for the real Casablanca office, linked to wikitours.ma, same NAP, real reviews only | C | Dec | Profile verified |
| M9 | AI crawlers: if wikitours.ma sits behind Cloudflare, check that search and answer bots are not blocked by default | C | With M1 | Settings checked |
| M10 | Same WhatsApp number as the satellites. Optional: one « Nos guides » page listing the satellites (one page, no sitewide links back) | C | Nov | — |

The weekly report carries a « money-site track » line (done / late), so this work has an owner and a date.

---

## 5. Site-by-site blueprint

**Common to every site**
- 6 trust pages: `/editeur/`, editorial policy, « Comment nous produisons nos contenus », corrections log, contact (WhatsApp + office), legal notice / privacy. **Written per site charter, not copied.** Legal notice and privacy pages are `noindex`. The duplicate gate checks trust pages too (only the one-line ownership footer is excluded).
- FR at the root and AR under `/ar/` (root language confirmed by Semrush / Search Console data, §6.6). **No full Arabic mirror:** AR only for pillars and for clusters with proven Arabic volume.
- Static HTML, zero JavaScript by default. Every page template has a « Ce que nous ne savons pas encore » section. Section labels (« Réponse courte », « À retenir », « Ce que nous ne savons pas encore ») and their order vary per site theme, so the sites do not share a boilerplate footprint.
- Page counts below exclude the 6 trust pages.

**Per-site launch checklist (definition of done; all required):**
1. Charter signed (audience, job, owned and banned concepts, data asset).
2. Domain history clean (D6).
3. Trust pages written for this site.
4. Licence shown only if A2 is proven; otherwise legal name and address only.
5. `legal_ok` recorded where the site needs it (prixomra, agency-naming pages, comparisons).
6. Every launch page entered in the registry by hand and passed through the cannibalisation guard before it was written (§6.5).
7. Cloudflare AI-bot allowances set; robots.txt checked.
8. Search Console and Bing verified; sitemap submitted.
9. Accessibility checks pass (§10.10).
10. Arabic pages fully read and signed by the Arabic reviewer; ritual pages by the religious reviewer.

### Overview

| Site | Job | Ref code | Wave | Launch pages (FR + AR) | L1 cadence |
|---|---|---|---|---|---|
| omra-ramadan.ma | Ramadan planning & deadlines | OR | 1 (plan 9-15 Nov) | 6 + 2 | ≤ 3/week; then set from registry supply after R1 |
| guideomra.ma | Sourced omra & Hajj reference | GO | 1 | 14 + 5 | 6/week |
| agenceomra.ma | Verify & choose a licensed agency | AG | 1 | 10 + 3 | 3/week |
| prixomra.ma | Price observatory (own data) | PX | 2 (survey threshold + licence-list URL + `legal_ok`; target early Dec) | 7 + 2 | 1/week + monthly snapshot |
| voyageomra.ma | Trip logistics, incl. CMN and Rabat-Salé airport sections | VO | 2 (target early Dec) | 12 + 3 | 3/week |
| omracasablanca.ma | CMN departures | CA | **Hold** → 301 to voyageomra CMN section (after D6) | — | — |
| offresomra.ma | Multi-agency dated offers | OF | **Hold** → 301 to Bab Makka page (after D6) | — | — |
| omrarabat.ma | RBA departures | RB | **Hold** → 301 to voyageomra Rabat-Salé section (after D6) | — | — |
| **Network** | | | | **≈ 64 pages** + trust pages (Wave 1 ≈ 40, pillars first ≈ 20 FR; Wave 2 ≈ 24) | **L1 ≈ 12/week (Nov), ≈ 16/week from Dec**, with the editor (E3); owner only ≈ 3-4 prose posts/week |

### 5.1 omra-ramadan.ma — Wave 1

| | |
|---|---|
| **Job** | The reference for planning an Omra in Ramadan from Morocco: dates, deadlines, when to book, what Ramadan changes. |
| **Audience / intent** | Informational and commercial investigation, peak Nov-Mar. Families; young adults (trend sourced: [Medias24 2025](https://medias24.com/2025/02/13/tourisme-religieux-la-omra-devient-une-tendance-qui-prend-de-lampleur-chez-les-jeunes/)); children planning for their parents (HYPOTHESIS, no source). |
| **Architecture** | `/dates-ramadan/`, `/dates-limites-visa/`, `/quand-reserver/`, `/dix-dernieres-nuits/`, `/omra-et-jeune/`, `/en-direct/` (dated changelog on the deadline tracker during Ramadan, not new posts), `/questions/`, `/ar/…`. Evergreen URLs with no year; the year goes in the H1. |
| **Pillars at launch** | 1) Ramadan 2027 dates, Saudi vs Morocco (ESTIMATE, « sous réserve d'observation du croissant »; Morocco was 1 day behind Saudi in 2026 [V] ([TelQuel](https://telquel.ma/instant-t/2026/02/18/jeudi-19-fevrier-1er-jour-du-mois-de-ramadan-au-maroc_1975833/)); the 2027 gap is UNVERIFIED). 2) 1448H season calendar and visa deadlines (9 Mar / 23 Mar / 7 Apr 2027 [V]). 3) When to book: timeline built on the 30-day visa window [L]. 4) First 10 days vs last 10 nights. 5) Omra while fasting (religious reviewer). 6) Questions hub (owned Ramadan clusters only). **Not on this site** (owned elsewhere and linked instead): crowds, heat and health, and flights (voyageomra); checklists and documents (voyageomra luggage list, guideomra documents); the glossary (guideomra, FR + AR). |
| **Content types** | Date/deadline explainers, fast-lane fact updates on the deadline tracker as dated changelog entries (moon sighting, Saudi rule changes), questions hub. Ramadan permit rules for 1448H are UNKNOWN and shown as such. |
| **Unique asset** | The fastest-updated **Ramadan 2027 deadline table** (Saudi date, Moroccan date, status expected/confirmed, official source, last-checked stamp), plus a static "arrival date → latest visa date" planner built only from registry facts. |
| **Conversion** | Answer → link to the Bab Makka Ramadan page (A6 URL) → WhatsApp « Omra Ramadan 2027 – dates, personnes, budget ». |
| **Design** | Night palette: deep indigo, lantern (fanous) gold, crescent line art. Moucharabieh lattice as a light CSS/SVG pattern. Arabic headings in Amiri or Noto Naskh Arabic (self-hosted subset). Dark by default with a light toggle. |
| **Pages at launch** | 6 FR + 2 AR |
| **Seasonality** | Full activity Oct-Mar. Maintenance Apr-Jul (≈ 1/week). Ramadan 2028 cycle from Aug 2027. |
| **Structure option (D19)** | Launching three new domains in Wave 1 splits scarce signals in the 111 days before Ramadan. Option: run Ramadan as `guideomra.ma/ramadan/` and 301 omra-ramadan.ma there until it has a distinct live asset beyond the deadline table (the §14.3 consolidation plan already uses this structure). Default: keep the domain, trimmed as above. |

### 5.2 guideomra.ma — Wave 1

| | |
|---|---|
| **Job** | The Moroccan, step-by-step Omra and Hajj guide: rituals, documents, health, permits, official calendars. |
| **Audience / intent** | Informational, year-round. First-time pilgrims, older pilgrims and their children. |
| **Architecture** | `/omra/` (ihram, tawaf, sa'y, taqsir), `/documents-visa/`, `/sante/`, `/nusuk-rawdah/`, `/calendrier-officiel/`, `/hajj/` (official timeline, preparation, rituals), `/lexique/`, `/questions/`, `/ar/…`. |
| **Pillars at launch** | 1) Omra étape par étape. 2) Ihram rules. 3) Documents et visa pour les Marocains (only sourced rules; Moroccans' e-visa status is UNVERIFIED and sources conflict). 4) Vaccin méningite ACWY (rule from 2025 [L], [Gulf News](https://gulfnews.com/living-in-uae/health/umrah-2025-meningitis-vaccine-now-mandatory-for-all-pilgrims-1.500025860); confirm for 1448H before use). 5) Nusuk et permis. 6) Rawdah permit (2026-27 rules UNVERIFIED; published only once confirmed). 7) Femmes et Omra (official text required; UNVERIFIED today). 8) Enfants et Omra. 9) Omra vs Hajj. 10) Hajj : rites jour par jour. 11) Hajj : préparation. 12) **Hajj 1449H : calendrier officiel** (dates, eligibility, lottery, official links; linking to the wikitours.ma agency-registration post). Published only on announcement and only after the D1 SERP-overlap check (§4.2). 13) Glossary FR/AR: **the network's only glossary**. 14) Questions hub (owned clusters only). Ramadan dates live on omra-ramadan; there is no separate Islamic-calendar page here. |
| **Content types** | Guides, how-tos, glossary, questions hubs, fast-lane official updates. |
| **Unique asset** | An **"official calendar" tracker**: every rule and date with its source, status [V]/[E]/[U] and "last checked" date; FR and AR side by side; a public corrections log. |
| **Conversion** | Guide → « Préférez-vous être accompagné ? » box (neutral list of what an agency adds) → WhatsApp. Links to the wikitours.ma ziyara and Hajj registration posts where relevant. |
| **Design** | Fassi green and sand, ivory paper, brass accents. Zellige star geometry as section dividers. Calm long-read layout, wide line-height for Arabic. |
| **Pages at launch** | 14 FR + 5 AR |

### 5.3 agenceomra.ma — Wave 1 (highest deception risk, handle with care)

| | |
|---|---|
| **Job** | How to verify and choose a licensed Omra/Hajj agency in Morocco. **No agency rankings.** |
| **Audience / intent** | Commercial investigation: people about to pay. |
| **Pillars at launch** | 1) Comment vérifier qu'une agence est agréée (ministry list; the KSAR TOURS case as reported by H24info [V]; the agency is named only if the naming rule below is met). 2) Labellisation Omra et listes d'agences Hajj (only sourced rules). 3) Contrat Omra : la checklist. 4) Payer en sécurité. 5) Arnaques Omra : les signaux d'alerte (sourced: [Hespress FR](https://fr.hespress.com/462180-omra-lobservatoire-du-consommateur-appelle-a-un-controle-renforce-des-agences.html), [Hespress EN](https://en.hespress.com/131697-moroccan-authorities-consumer-groups-warn-against-travel-scams-amid-luxury-umrah-audit.html)). 6) Litige : que faire (amicable settlement at ministry delegations first; Law 11-16 allows sanctions [V], [Hespress](https://fr.hespress.com/441379-hajj-et-omra-mesures-renforcees-pour-proteger-les-pelerins-marocains.html)). 7) Questions à poser à une agence. 8) Agence ou réservation directe sur Nusuk (neutral; Nusuk Umrah exists [V], [haj.gov.sa](https://haj.gov.sa/en/Media-Center/Ministry-News/Ministry-of-Hajj-and-Umrah-launches-Nusuk-Umrah-service-to-enable-pilgrims-from-outside-the-Kingdom); Moroccans' access UNVERIFIED; never claim DIY is impossible). 9) The Feb 2026 Saudi suspension of about 1,800 foreign agencies and what buyers should check [V] ([Gulf News](https://gulfnews.com/world/gulf/saudi/saudi-arabia-suspends-1800-foreign-umrah-agencies-after-review-1.500430224)). 10) Disclosure and method page. |
| **Unique asset** | A printable HTML **verification checklist**, offered for co-publication with the consumer observatory (§8.5). A sourced log of fraud patterns. |
| **Naming rule** | Fraud content cites press or official sources only and uses « présumé » / « selon [source] ». An agency is named only when an official sanction source exists. The Feb 2026 Marrakech case is an arrest with an alleged amount, not a conviction. Any page naming an agency builds only with `legal_ok` (§5.4). |
| **"Vérifiez-nous aussi"** | A box inviting readers to check Wiki Tours with the same method the site teaches (licence, official list, address, contract). |
| **Directory** | A national directory built from the ministry's official list is **out of launch scope**. Reuse terms of the list are UNVERIFIED. Only after the lawyer's OK (E1), as one filterable page, never city pages, Wiki Tours marked « Éditeur ». |
| **Disclosure** | Permanent box: « agenceomra.ma est publié par Wiki Tours International, agence de voyages. Nous ne classons pas les agences. » All links to wikitours.ma are `nofollow`. |
| **Conversion** | Soft: « Posez vos questions à une agence agréée (Wiki Tours, éditeur de ce site) » → WhatsApp. ≤ 30% of posts link to wikitours.ma. |
| **Design** | Civic and sober: white, navy, green check marks, tadelakt texture, large checklists. **No resemblance to government seals.** |
| **Pages at launch** | 10 FR + 3 AR |

### 5.4 prixomra.ma — Wave 2 (goes live when the first survey reaches its threshold)

| | |
|---|---|
| **Job** | Morocco's Omra price observatory: dated, sourced, method published. Also the official Hajj cost history. |
| **Audience / intent** | "Combien coûte la omra", Ramadan premium, budget planning, journalists. |
| **Pillars at launch** | 1) Latest snapshot table. 2) Method. 3) « Snapshot Ramadan 2027 » (own data). 4) Price history: official Hajj cost 63,021 MAD for 1447H [V] ([Le360](https://fr.le360.ma/societe/hajj-1447h-les-frais-definitifs-fixes-a-63021-dirhams_HFBAQQU5INGOPKRWSNL7NY2QN4/); other outlets report 63,221 and 63,121 MAD — the conflict is shown); 1448H provisional 65,000 MAD, final cost not announced [L] ([EcoActu](https://ecoactu.ma/hajj-1447h-le-cout-fixe-a-63-021-dh-remboursement-prevu-des-le-9-mars-2026/)); Ramadan averages ≈ 25,000 MAD (2023) and ≈ 35,000 MAD (2024) quoted by the federation [L] ([Medias24](https://medias24.com/2024/04/03/omra-2024-inflation-situation-geopolitique-et-secteur-informel-ont-fait-chuter-le-nombre-de-pelerins/)). 5) Ce qui fait le prix (hotel distance, room basis, flights, season). 6) Room-basis glossary. 7) Data download page (CSV). |
| **Unique asset** | `data/prices/observations.csv`: agency, licence checked, package dates, nights, hotels, distance, room basis, carrier and departure city, price MAD, capture date, proof URL + screenshot (stored privately). |
| **Data rules (DESIGN CHOICES)** | **Published dimensions fixed in advance:** season × tier only, room basis normalised to quad or double. Every cell needs **n ≥ 8**, otherwise « données insuffisantes »; never fill gaps. With about 3 tiers per season that means ≥ 24 usable offers in the best case, and offers are rarely spread evenly, so the **survey target is 40+ offers from ≥ 8 licensed agencies** (survey time ESTIMATE 4-12 h, C3). **Wiki Tours is excluded from every computed statistic** and shown in a separate, labelled row « Offre de l'éditeur ». Social-media offers (Facebook, Instagram, TikTok) are captured **by hand only** (platform terms on automated extraction UNVERIFIED). CSV published under CC-BY so media and AI engines can cite it. **Blocked until the official licence-list URL is confirmed**: without it the licence status of observed agencies cannot be checked (UNKNOWN today). |
| **Disclosure** | « Observatoire publié par Wiki Tours International, une agence concurrente des agences observées. Méthode et données brutes publiées. » All links to wikitours.ma `nofollow`. |
| **Legal gate (`legal_ok`)** | Comparative and misleading-advertising rules are NOT RESEARCHED (E1). The build refuses prixomra, any comparison page and any agenceomra page naming an agency unless config holds a lawyer sign-off date. **Correction and right of reply:** any observed agency can ask for a correction; we answer within 48 h and log the outcome publicly. |
| **Conversion** | Below the table, never inside it: « Voir les offres Bab Makka (éditeur) » on **≤ 20%** of posts → WhatsApp « Je veux un devis Omra – budget ___ ». |
| **Design** | Data-journal look: off-white and charcoal, terracotta or saffron accent, tabular numerals, static SVG charts (no JS), subtle zellige grid background. |
| **Pages at launch** | 7 FR + 2 AR |
| **Cadence** | Data-bound: 1 snapshot per month (twice in Dec-Jan) + 1-2 analysis posts. Never more than the data supports. |

### 5.5 voyageomra.ma — Wave 2

| | |
|---|---|
| **Job** | The practical trip: flights from Morocco, airports, luggage, heat and health, travelling with elderly parents or children, getting around Makkah and Madinah. |
| **Pillars at launch** | 1) Vols Maroc → Jeddah / Médine: carriers sourced (flynas Jeddah-Casablanca since 2023 and Jeddah-Rabat since 4 Jul 2026 [V], [flynas](https://www.flynas.com/en/media-center/news-updates/flynas-announces-the-launch-of-direct-flights-between-jeddah-and-the-moroccan-capital-rabat-starting-from-july-4th-becomimg-the-first-saudi-carrier-to-operate-direct-flights-between-the-two-cities); RAM sells Casablanca-Jeddah and Casablanca-Medina [L], [RAM](https://www.royalairmaroc.com/en/flights-to-saudi-arabia); frequencies UNKNOWN → « vérifiez auprès de la compagnie »; Ramadan capacity history: RAM's Ramadan 2023 program [V], [SNRTnews](https://snrtnews.com/fr/article/omra-et-haj-la-ram-deploie-un-nouveau-programme-de-vols-69745)). 2) **Aéroports de départ au Maroc**: a national page with a **Casablanca Mohammed V (CMN) section** (target of the omracasablanca.ma 301: Terminal 3 departure steps, getting to CMN with sourced transport facts, Makkah Route at CMN **for Hajj only**, confirmed for Hajj 2026, 5th year [V], [TelQuel/ONDA](https://telquel.ma/instant-t/2026/05/22/hajj-2026-londa-deploie-un-dispositif-special_1991022/)) and a **Rabat-Salé section** (target of the omrarabat.ma 301): flynas Rabat-Jeddah (reported 2 weekly from 19 Aug 2026 [L]); Makkah Route at RBA **for Hajj only, confirmed for 2026** [V]. 3) Liste de bagages (homme / femme). 4) Chaleur et santé (the network's only heat and health page; omra-ramadan links here). 5) Distance de l'hôtel expliquée. 6) Voyager avec des parents âgés. 7) Voyager avec des enfants. 8) Bagages et Zamzam (airline-sourced only). 9) Guide d'achat du kit ihram (no shop). 10) Argent à l'étranger (only after an official Office des Changes source; UNKNOWN today). |
| **Unique asset** | An airport-by-airport departure guide for Morocco, plus real field notes from Wiki Tours group guides (monthly interview, consented). |
| **Merchant Center** | **Frozen** (§10.9). Never travel packages. |
| **Conversion** | Logistics answer → « Wiki Tours s'occupe des vols et des hôtels » → WhatsApp. |
| **Design** | Travel journal: kraft-paper tone, warm ochre and terracotta, route-line illustrations, stamps, ticket-stub cards, tick-box checklists. |
| **Pages at launch** | 12 FR + 3 AR |

### 5.6 omracasablanca.ma — ON HOLD (default)

- **Problem:** a city domain that funnels to one agency matches Google's first doorway example almost word for word: "multiple domain names or pages targeted at specific regions or cities that funnel users to one page" ([Google](https://developers.google.com/search/docs/essentials/spam-policies)). Its two distinctive assets are owned elsewhere. (a) The office, address, hours and team target the local intent reserved for wikitours.ma and its Google Business Profile, so an office page would compete with the money site. (b) CMN departure logistics belong on voyageomra's national airports page. What remains is about 8 pages and 1 post a week: thin by design. Makkah Route at CMN is Hajj-only, so it cannot carry Omra content.
- **Now:** **301 to voyageomra.ma's CMN section**, after a clean domain-history check (D6).
- **If you insist on running it (D20):** no office page (the office lives on `/editeur/` and wikitours.ma); ≤ 20% of posts with a money link, all `nofollow`; the CTA « Venir à l'agence » is text only; every page needs a Casablanca-specific verified fact or real photo; no Google Business Profile and no LocalBusiness markup. Before assigning any keyword, run a SERP-overlap test of « omra casablanca » / « omra départ casablanca » (PLACEHOLDERS) against the reserved « agence omra casablanca ». If overlap is ≥ 4/10, those keywords are reserved for wikitours.ma.
- **Design if ever built:** Casablanca Art Deco and neo-Mauresque: white façades, ocean blue, cream, geometric ironwork lines.

### 5.7 offresomra.ma — ON HOLD

- **Problem:** a Bab-Makka-only offers board duplicates wikitours.ma's Bab Makka page (a doorway). A real multi-agency board is useful but sends some demand to competitors and needs legal review.
- **Now:** **301 to the Bab Makka page in the right language** (A6 URL), only after a clean domain-history check (D6). If the domain has an unrelated history, it is dropped or redirected to a satellite, never to wikitours.ma. Commercial intent is best served by bookable offers, and a redirect is not a doorway.
- **Relaunch condition (Wave 3, earliest Mar 2027):** **both** your decision to list other licensed agencies' public offers **and** the lawyer's OK (E1).
- **If launched:** dated offers board fed by the same survey pipeline as prixomra. Each offer shows operator, licence, price, room basis, departure city, valid-until, source link. Wiki Tours offers carry « Offre de l'éditeur » and are never pinned first by default (sort criterion shown). Outbound and wikitours.ma links `nofollow`. A list page is indexed only with ≥ 5 live offers (design choice). Expired offer: banner + noindex the same day, 301 to the hub after 30 days. Design: market-board cards inside horseshoe-arch frames, saffron and white.

### 5.8 omrarabat.ma — ON HOLD

- **Problem:** no Rabat office is known. A Rabat site funnelling to wikitours.ma is the textbook doorway case.
- **Now:** **301 to voyageomra.ma's Rabat-Salé airport section** (after D6), where the genuine Rabat facts live (flynas Rabat-Jeddah; Makkah Route at RBA, Hajj 2026 only).
- **Build only on written confirmation** of RBA departures sold by Wiki Tours **or** a staffed Rabat presence (A4). Decision default by **22 Nov 2026**: keep the 301.
- **If built later:** the same strict rules as an omracasablanca override (§5.6), with the real Rabat presence shown honestly. Never imply an office that does not exist (« Wiki Tours est basée à Casablanca »). No LocalBusiness markup. Design: Oudayas blue and white, Andalusian garden motifs.

---

## 6. Keyword system

### 6.1 Pipeline

```
Semrush CSVs (R0-R4, Morocco DB)  +  Search Console queries (from week 4)  +  WhatsApp questions (anonymised)
  → ingest (file-name contract, header aliases, "n/a" kept as null, never imputed;
            reference files — or-pages, or-competitors, serp-manual — parsed without a Keyword column, kept out of the registry)
  → normalise FR/AR → match_key (oumra/umrah/عمرة → omra; hadj/haj → hajj; diacritics and years removed)
  → KEYWORD REGISTRY (one JSON file, schema-validated; human decisions replayed from decisions.jsonl)
  → reserve wikitours.ma concepts, in every language (from its Organic Research export R2 + its known URLs + §4.2)
  → cluster (licensed SERP overlap; lexical fallback + human confirmation)
  → assign each cluster to ONE owner site (by charter); ambiguous → "unassigned" decision card
  → brief queue → cannibalisation guard at publish → weekly GSC feedback → new long-tail candidates
```

Prototype modules (ingest, normalise, cluster, cannibalisation guard, schemas) are tested on synthetic data only, in `/tmp/claude-0/-home-user-blog-omra/bdf83659-de4f-5356-99c2-6f27ba7b310e/scratchpad/proto/`. On 2026-10-20 the ingester was extended to accept every file type the Semrush brief names (reference reports, `kgap_sets.txt` conversion, R0 columns, subfolder slugs), with one synthetic file per type tested. They move into `packages/keywords/` in week 2.

### 6.2 Semrush exports

The exact, step-by-step export brief is in **`docs/strategy/SEMRUSH-BRIEF.md`**. Summary:

| ID | Report | Purpose |
|---|---|---|
| R0 | Your 10 main keywords per site (manual CSV) | Seeds the registry |
| R1 / R1q | Keyword Magic Tool (all keywords + Questions) | Keyword universe, questions for answer formats |
| R2 | Organic Research → Positions, **wikitours.ma (mandatory)** + competitors | Reserves the topics wikitours.ma already ranks for |
| R3 | Keyword Gap (Missing / Untapped / All) | Gaps to give to satellites vs the money site |
| R4 | Position Tracking (weekly) | Main-keyword rank monitoring |

Cadence: R0-R3 at kickoff, a refresh around 30 Nov 2026 (≈ 10 weeks before Ramadan), then quarterly. R4 weekly. Exact current Semrush column headers are UNVERIFIED, so the ingester maps known aliases, rejects **keyword** files without a Keyword column, parses reference files (Pages, Competitors, manual SERP) separately, and reports unknown columns.

### 6.3 The 10-main-keyword rule

1. Each **active** site has exactly 10 main keywords (R0). Each maps to **one** pillar or hub URL on that site.
2. A keyword can be "main" for only one site network-wide (unique by `match_key`; e.g. "omra ramadan 2027" = "oumra du ramadan 2026").
3. It can **never** be a wikitours.ma-reserved topic (§4.2). The ingester rejects it and proposes a replacement.
4. **Validation before acceptance:** (a) it fits the site's job; (b) its SERP type matches what the site can win (an info site will not win a local-pack or airline-booking SERP); (c) it does not overlap another site's main-keyword cluster. Rejections are logged with a reason.
5. Main keywords get Position Tracking and a dashboard row: **30 at Wave 1** (3 sites × 10), **up to 50 after Wave 2** (5 sites; more only if held sites relaunch).
6. **Partner signal:** if you cannot find 10 distinct, job-matching main keywords for a site, its job is too narrow. That site is a merge candidate.

### 6.4 Clustering

- **Preferred — SERP overlap:** licensed top-10 snapshots (Google, gl=ma, hl=fr or ar, mobile, all in the same week) from the Semrush API or a SERP API provider (cost UNKNOWN). Never scrape Google. Same cluster at **≥ 4 shared URLs**; **3** = human review band (common practice, tune on data).
- **Fallback — lexical:** same `match_key`, then token Jaccard ≥ 0.6, plus human confirmation. Max 10 cluster decision cards per week; clear cases are assigned automatically.
- **Refresh quarterly.** A changed cluster never moves a published URL automatically; it raises a review item.

### 6.5 Cannibalisation guard

**Before publishing (blocking), across all sites + known wikitours.ma URLs:**
- the primary keyword must be in the registry and owned by this site (reserved → blocked, link suggested instead);
- **reserved concepts are language-agnostic:** each cluster carries a `concept_id` shared across FR/AR/EN, and a reserved concept is blocked on every satellite in every language;
- **one owner site per concept:** AR versions exist only on the site that owns the FR concept, linked by `translation_key`;
- one URL per `match_key`; one URL per cluster (a new angle becomes an **update** to the existing URL);
- SERP overlap ≥ 4/10 with any network URL blocks;
- title token Jaccard ≥ 0.6 blocks (same language);
- body 5-word-shingle Jaccard ≥ 0.5 blocks (same language; shingles do not work across languages, so cross-language duplication is caught by `concept_id`). Template boilerplate is stripped before shingles and SimHash are computed, so real duplicates still show;
- **launch pages too:** every Wave 1 and Wave 2 page is entered in the registry by hand and passes this guard **before it is written**.

**After publishing (weekly, from Search Console):** a query where ≥ 2 network URLs (or a network URL + wikitours.ma) each hold ≥ 20% of impressions over 28 days, with alternating positions, goes on the cannibalisation list. Suggested fixes: merge + 301, de-optimise, or relink. Thresholds are design choices.

### 6.6 Long tail, Arabic and Darija

- **Long-tail sources:** R1 broad match and Questions (R1q), Keyword Gap (R3), Search Console "orphan queries" (impressions but no owner page; proposed weekly as new clusters), and real WhatsApp questions (C5). Each new cluster needs a registry owner before any brief is written.
- **Language split:** we found no public data on whether Moroccans search Omra in French, Arabic or Darija. A survey reports Darija spoken by 100% of respondents but written by only 39%, and French fluency at 19% [L] ([Hespress](https://en.hespress.com/112190-112190.html)). **Decide the root language from Semrush MA and Search Console data.** Default: FR root, AR under `/ar/`.
- **No full Arabic mirror.** AR versions for pillars and for clusters where Semrush or Search Console show real Arabic volume. A full mirror doubles review load.
- **Arabic production:** AR pages are drafted in Modern Standard Arabic from the same approved facts and **never publish without the named Arabic reviewer's full read**. Reviewer time ESTIMATE ≈ 15-20 min per AR page (≈ 15 AR launch pages ≈ 4-5 h), then ≈ 1 h/week at L1. Who drafts and reviews MSA is decision D8.
- **hreflang:** `fr-MA` / `ar-MA` / `x-default`, only between true equivalents on the **same** site, reciprocal ([Google](https://developers.google.com/search/docs/specialty/international/localized-versions)).
- **Darija** has no ISO 639-1 code (`ary`), so it cannot be its own hreflang value. Arabic-script Darija uses `ar-MA`. Latin-script Darija queries (e.g. "3omra", PLACEHOLDER) stay in FR clusters, flagged for review, using only spellings that appear in Semrush or Search Console — **we never invent spellings**. Darija goes first to WhatsApp and video scripts; Darija pages only if Search Console shows real impressions.

### 6.7 Placeholder main-keyword examples (PLACEHOLDER — replace with Semrush; volumes UNKNOWN)

| Site | Placeholder candidates (FR / AR) |
|---|---|
| omra-ramadan.ma | omra ramadan 2027 · date ramadan 2027 maroc · visa omra ramadan date limite · omra 10 dernières nuits · عمرة رمضان 2027 |
| guideomra.ma | étapes de la omra · documents omra maroc · vaccin méningite omra · permis rawdah nusuk · مناسك العمرة · hajj 2028 maroc calendrier ⚑ |
| agenceomra.ma | agence omra agréée maroc · vérifier agence de voyage agréée · arnaque omra · contrat omra · وكالة عمرة معتمدة |
| prixomra.ma | prix omra 2027 maroc · prix omra ramadan · combien coûte la omra · ثمن العمرة المغرب · coût hajj maroc ⚑ |
| voyageomra.ma | vol omra depuis le maroc · vol rabat jeddah · liste valise omra · chaleur omra conseils · لوازم العمرة |
| omracasablanca.ma (hold; CMN topics go to voyageomra) | omra départ casablanca ⚑ · aéroport mohammed v terminal 3 omra |
| **Reserved for wikitours.ma** | wiki tours · bab makka · gammes omra économique vip · inscription hajj agence · quota hajj agences · que visiter médine ziyara · agence omra casablanca (likely a local-pack SERP: verify) |

⚑ = sits next to a reserved wikitours.ma intent (Hajj via agency/quota; « agence omra casablanca »). Its `match_key` differs from the reserved one, so only a SERP check shows the overlap: it stays `unassigned` until that check or your decision is recorded.

---

## 7. Content engine

### 7.1 Reframing "24 posts/day"

The machine **can** produce 24 drafts a day. That is not the constraint. The real limits are:

| Limit | Fact |
|---|---|
| Human review capacity | Google: "critical to manually fact-check and review all AI-generated content" (1 Oct 2026) [L]. At ≈ 15 min/post (estimate), 24/day ≈ 42 h/week of review. |
| Verified facts and original data | Every claim must come from the registry. |
| Distinct intents | The size of the Moroccan Omra/Hajj keyword universe is UNKNOWN until Semrush arrives. At 3/day a site consumes ≈ 1,095 clusters a year. If a site has, say, 300 real clusters (placeholder), it would run out in ≈ 100 days and everything after would be near-duplicate — which the gates block anyway. |

**Rule: volume = min(review capacity, unique clusters, verified facts/data).** 3/day/site stays as the hard ceiling in the scheduler, never a target.

### 7.2 Cadence ladder (DESIGN CHOICE)

| Level | Network posts/week | Human review needed (ESTIMATE) | Move up only if… |
|---|---|---|---|
| L0 launch | Launch pages only (Wave 1 ≈ 40, of which ≈ 20 FR pillars go first; Wave 2 ≈ 24; plus trust pages) | ≈ 16-21 h of named-reviewer time at 15-20 min/page (Wave 1 pillars ≈ 5-7 h). Arabic and religious reviewer time on top (§16.4) | Charters signed, facts registry v1 approved, P0 checklist complete |
| **L1a (owner only)** | **≈ 3-4 prose posts** + data-table updates | You: ≈ 45-60 min/week of full reads, inside ≈ 2 h/week in total | Default if there is no editor |
| **L1 (start, with editor)** | **≈ 12 in Nov (Wave 1), ≈ 16 from Dec; ceiling 25** | Part-time Moroccan editor ≈ 5-6 h/week (E3) + you ≈ 2 h/week | Editor in place and trained on the rubric |
| L2 | 35-50 | ≈ 9-13 h/week of reviewer time at 15 min/post | Unlock criteria below, 4 consecutive weeks |
| L3 | 70-100 | ≈ 18-25 h/week of reviewer time | L2 green for 8 weeks + unlock criteria |
| L4 = your plan | 168 (3/day × 8) | ≈ 42 h/week at 15 min/post | **Not recommended.** Only if L3 has been green 12 weeks and Semrush shows enough distinct intents |

**Unlock criteria per site** (automatic check, all required for **4 consecutive weeks**):
- index ratio ≥ 80% for posts aged 14-60 days (≥ 20 eligible posts);
- 0 confirmed fact errors;
- weekly random sample passes the 6-question rubric (§16.6);
- gate failure rate < 20%;
- mean nearest-duplicate score < 0.20;
- impressions trend not falling (seasonality-adjusted);
- the registry holds **≥ 30 days of unique unassigned clusters** at the new cap;
- review hours for the new level are actually available.

Scale-up always needs your approval. Scale-down is automatic (§16.5).

**L1 split:** Nov: omra-ramadan ≤ 3/wk, guideomra 6/wk, agenceomra 3/wk (≈ 12). From Dec add prixomra 1/wk (+ monthly snapshot, a data page) and voyageomra 3/wk (≈ 16). After R1, omra-ramadan's cadence is set from registry supply: it rises only if ≥ 30 days of unique unassigned clusters exist ahead. Any spare effort goes into updating the deadline tracker in place. Owner-only (L1a): the 3-4 weekly prose posts go to the site with the nearest deadline.

**Partner suggestion:** to scale, buy **review capacity** (E3: a part-time editor, ≈ 5-6 h/week for L1; more for L2+), not domains.

### 7.3 Content types and templates

Every page uses an **answer-first template** (labels and their order vary per site theme, §5):
1. H1 + « Réponse courte » (40-60 words) with the key fact and its date.
2. « À retenir » table (dates, amounts, requirements) from registry facts only.
3. Sections with question-style H2s in the reader's language.
4. « Ce que nous ne savons pas encore » (e.g. « Date officielle du Ramadan au Maroc : annoncée par le ministère des Habous »).
5. Next step: WhatsApp CTA + disclosure; optional contextual link.
6. Numbered sources (publisher, URL, date accessed), « Faits vérifiés le », byline per §4.5.

| Type | Tier | Word floor (editorial) | Must contain | Publish path |
|---|---|---|---|---|
| Pillar guide | A | 1,500 | Short answer, table, ≥ 2 sources, named author + reviewer | Weekly approval + named sign-off |
| Rule explainer (visa, Hajj, health) | A | 800 | Official source per rule, last-checked date, unknowns section | Weekly approval, full read |
| Comparison / method | A | 1,200 | Disclosure, criteria, table, method, limits | Weekly approval + lawyer once |
| Supporting how-to / checklist | C | 800 | Numbered steps, ≥ 1 source, ≥ 3 internal links | Weekly batch approval |
| Questions hub / glossary page | C | 600 | Grouped Q&A linking to owner pages (no thin single-question pages) | Weekly batch approval |
| Local logistics | A first time, then C | 800 | Verified local fact or real photo | Weekly approval |
| Price snapshot | B | — (no floor) | Table values on the **stable series URL**; dataset ≤ 30 days old, n shown, method link | **Auto for table values only** (data human-verified at capture). Any commentary prose goes through the approval queue |
| Offer record (if offresomra launches) | B | — | Offer record valid today, licence, source, expiry | **Auto for the record** |
| Fact-table update (dates, deadlines) | B | — | Changed registry fact + official source, updated in place on a stable URL | **Auto** after the fact is approved |
| Official announcement | B | — | A **dated changelog entry on the existing tracker** + the changed fact-table row. No new post, no free prose | **Fast lane** (§16.3). Any explanatory prose goes through the approval queue |

Word floors are editorial, not ranking rules: Google has no preferred word count ([Google](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)). Tier B has no word floor: data pages carry data, not padding.

### 7.4 Quality gate checklist (automated; any **error** blocks; a **warning** goes to the digest)

| # | Gate | Rule |
|---|---|---|
| 1 | Front matter | Valid against the schema; real author ID or the Organisation; tier set; `reviewed_by` (accepted only with `full_read: true`) required to schedule prose |
| 2 | **Facts gate** | Any sentence with a digit (Latin or Arabic-Indic) or a rule word (Unicode-aware stems, so gender and plural forms count: obligatoir-, interdi-, exig-, requis/requise, gratuit-, garanti-, rembours-, quota, visa, vaccin-, délai, date limite, واجب, ممنوع, إلزامي, مجاني, تأشير-, مضمون, with ال- prefixes) must cite an **approved, unexpired** fact with `[[fact:id]]`. Every number must equal a value of the cited fact(s). **No digits in prose outside fact markers**, except fixed expressions in an approved-phrases file (e.g. « les 10 dernières nuits »). Code in §10.4 (tested). |
| 3 | **Claims verifier** (from Wave 2; until then the full human read covers it) | A separate Claude API call lists every checkable claim and maps it to fact IDs. Any unmapped claim = error. One auto-revision, then discard + log. `[[MISSING: …]]` requests become fact candidates. |
| 4 | **Religious text** | Qur'an verses, hadith and du'a must match an entry in `data/facts/kb/` exactly (with source), approved by the named religious reviewer. The generator never writes them from memory. |
| 5 | Entity list | Agency names, airlines and official bodies must be on the registry's allowed-entity list |
| 6 | Cannibalisation | §6.5 |
| 7 | Duplicate | 5-shingle Jaccard ≥ 0.50 or SimHash-64 Hamming ≤ 3 against any network page (trust pages included) blocks; 0.30-0.50 warns; template boilerplate is stripped first ([Manku et al. 2007](https://dl.acm.org/doi/10.1145/1242572.1242592); thresholds are design choices) |
| 8 | Citations | ≥ 2 sources for guide / news / comparison / price report, ≥ 1 otherwise. Visa, Hajj and health rules must cite official sources (habous.gov.ma, haj.gov.sa, Nusuk). |
| 9 | Links | ≥ 3 same-site links; ≤ 1 sister link; ≤ 1 wikitours.ma link; `nofollow` per §3.5; per-pair caps; no reciprocal page pairs; **0 exact-match commercial anchors** to wikitours.ma; all internal hrefs resolve; no orphans |
| 10 | Disclosure | Any mention of Wiki Tours or Bab Makka → disclosure box present |
| 11 | Seat / availability freshness | Seat or availability wording only from a Wiki Tours offer record with `as_of`; **hidden automatically if older than 7 days** |
| 12 | Meta | Title 20-70 chars, description 70-160, both unique network-wide; one H1; `lang`/`dir`; self-canonical |
| 13 | Stale year | A year in title or H1 lower than the current season year blocks |
| 14 | Banned claims | « garanti », « 100% », « مضمون », « 0% d'intérêt », fake urgency, superlatives about Wiki Tours |
| 15 | Schema | JSON-LD parses and matches visible text; no Event, no self-review stars, no LocalBusiness on satellites |
| 16 | Unknowns section | Present on every page (can say « Rien d'important à signaler » only if the brief says so) |
| 17 | Images | Alt text, width/height, rights recorded (own / client / cc0 / cc-by / purchased); no AI image presented as a real photo |
| 18 | Performance and accessibility | Lighthouse mobile ≥ 90, CLS ≤ 0.1, LCP ≤ 2.5 s (lab), plus the Lighthouse accessibility audit (§10.10), on one new URL per changed site per deploy |
| 19 | **Legal (`legal_ok`)** | prixomra pages, comparison pages and any page naming an agency build only if config holds a lawyer sign-off date |
| 20 | **Licence** | The trust block and any licence or « depuis 2016 » mention render only if the fact is `approved` with `source_tier: "official"` and the ministry-list URL |
| 21 | **Arabic reviewer** | An AR page schedules only with the Arabic reviewer's `full_read` sign-off |

### 7.5 Sourcing original information (the anti-commodity layer)

| Asset | Source | Who | Frequency |
|---|---|---|---|
| Price observations | Public agency offers (URL + screenshot), captured by hand; social-media offers by hand only (platform terms UNVERIFIED) | Staff or assistant (C3) | Monthly; twice in Dec-Jan |
| Wiki Tours offers | Offers sheet (A7) | Staff | Weekly |
| Official facts | Watchers on habous.gov.ma, haj.gov.sa, Ministry of Tourism, ONDA, airline news pages, and the government announcement of Morocco's Ramadan time change (respecting robots.txt; page text treated as untrusted data, §10.10) | Automated proposals, human approval | Daily watch |
| Field experience | 20-30 min monthly voice interview with a group guide, transcribed, quotes used with consent | Staff | Monthly |
| Real photos | Office, CMN departures, groups (consent) | Staff | Per trip / season |
| Real questions | Top 5 WhatsApp questions per week, anonymised | Staff | Weekly |
| Post-trip feedback | Consented questionnaire, aggregate stats; no incentives that skew it; never review stars | Staff | Per season |

### 7.6 Editorial calendar: Islamic + Moroccan school calendar, Oct 2026 – Dec 2027

[V] verified · [E] Hijri estimate (moon sighting; Morocco was 1 day behind Saudi in Ramadan 2026) · [U] unverified. Sources: Saudi 1448H calendar ([haj.gov.sa](https://haj.gov.sa/en/Media-Center/Ministry-News/2026/Ministry-of-Hajj-and-Umrah-Announces-the-Umrah-Season-Calendar-for-1448-AH)); school breaks, Decision 047.26 ([Le360](https://en.le360.ma/society/2026-27-school-year-key-dates-for-students-and-teachers_ORTNN5RKQ5DYJGJHTE5ULMCDYM/)); Ramadan 2027 ([Wego](https://blog.wego.com/ramadan-2027/)); Dhul Hijjah 1448 ([Khaleej Times](https://www.khaleejtimes.com/uae/ramadan-eid-al-fitr-eid-al-adha-2027-likely-dates)); Rajab/Sha'ban ([moonsighting.org.uk](https://moonsighting.org.uk/moon/sighting-reports/report-1448-08.html)); 1449H ([truecalendar](https://truecalendar.com/hijri/1449)); Mawlid ([islamic.app](https://islamic.app/hijri/mawlid/2027)).

| Month | Calendar events | Satellite focus |
|---|---|---|
| Oct 2026 | School break 18-25 Oct [V]. Ramadan booking window open. | Build. Facts registry v1. Wave 1 pillars. |
| Nov 2026 | Peak Ramadan decision period. **Watch for the Hajj 1449H registration announcement** [U] (1448H was 8-19 Dec 2025 [V]) | Wave 1 live. When to book; last 10 nights; scam signals (AG). Hajj 1449H timeline drafted, published only on announcement (GO, fast lane). Price survey #1. |
| Dec 2026 | School break 6-13 Dec [V]. Rajab ≈ 10 Dec [E]. Possible Hajj registration [U]. | Wave 2 live. Snapshot #1 + PR (≈ 8-10 Dec). Winter family Omra (VO, OR). |
| Jan 2027 | Sha'ban ≈ 9-10 Jan [E]. Mid-year break 24-31 Jan [V]. Ramadan visas issued from ≈ mid-Jan (derived from the 30-day rule [U]). | Visa timing (OR). Fasting and Omra (OR, religious review). Pre-departure checklists (VO). Snapshot #2 + PR (≈ 18-20 Jan). |
| Feb 2027 | 1 Ramadan ≈ 8 Feb Saudi / 8-9 Feb Morocco [E]. Last 10 nights ≈ evening of 27 Feb to 8 Mar (Saudi; Morocco possibly +1 day) [E]. Hajj 1448H final cost possible [U] (1447H: 3 Mar 2026 [V]). | Live date updates (OR). Same-day Hajj cost update (PX, GO). |
| Mar 2027 | Eid al-Fitr ≈ 9-10 Mar [E]. **Visa issuance closes 9 Mar, entry closes 23 Mar [V].** Spring break 21-28 Mar [V] **cannot be used for Omra**. | Post-Ramadan price report (PR). Hajj preparation (GO). Contract checklist (AG). Wave 3 decisions (offresomra, omrarabat). OR to maintenance. |
| Apr 2027 | Last departure 7 Apr [V]. Moroccan Hajj outbound flights likely in May [U] (2026: 91 outbound flights from 9 airports [V], [TelQuel](https://telquel.ma/instant-t/2026/05/22/hajj-2026-londa-deploie-un-dispositif-special_1991022/); first outbound 1 May, last 21 May and 78 return flights 31 May-18 Jun per a search summary of [TelQuel, 9 Jun 2026](https://telquel.ma/instant-t/2026/06/09/hajj-1447-plus-de-11-000-pelerins-marocains-deja-rentres-78-vols-prevus-au-retour_1993201/) [L]). | Hajj logistics (VO). Makkah Route only if confirmed for 2027. |
| May 2027 | Dhul Hijjah ≈ 7-8 May, Arafah ≈ 15-16, Eid al-Adha ≈ 16-17 May [E]. School break 9-16 May [V] (Hajj season, no Omra). 1449H Umrah season may open ≈ 20-21 May [U]. | Hajj day by day (GO). Summer Omra only after the Saudi 1449H calendar is published. Hajj domain decision (§17). |
| Jun 2027 | 1 Muharram ≈ 5-6 Jun [E]. Ashura ≈ 14-15 Jun [E]. End of classes ≈ 2 Jul [U]. | Summer family Omra, heat safety (VO). Summer price snapshot (PX). Half-year audit. |
| Jul 2027 | School holidays. 2027-28 school calendar expected [U]. | Departures logistics. Diaspora angle UNVERIFIED (check GSC country data). |
| Aug 2027 | Mawlid ≈ 14-15 Aug [E] (demand: no data). | Ramadan 2028 dates explainer (draft; late Jan 2028 [E], not researched). |
| Sep 2027 | New school year (dates UNKNOWN). | Annual « état des prix de la Omra » report (PR). Evergreen refresh. |
| Oct 2027 | Ramadan 2028 booking window. | Repeat the Oct 2026 playbook with the 1449H Saudi calendar. |
| Nov 2027 | Possible Hajj 1450H registration [U]. | Hajj timeline update (fast lane). Ramadan 2028 deadlines. |
| Dec 2027 | Rajab 1449 [E, not researched]. Winter break UNKNOWN. | Winter family window. Annual portfolio review. |

**Timing rule (design choice):** publish money-adjacent pages 8-12 weeks before a peak and refresh them 2-4 weeks before.

### 7.7 Refresh policy

| Trigger | Action |
|---|---|
| A registry fact changes or expires | Every page using it (via `facts_used`) is re-rendered at paragraph level, gated, and queued for approval (fact tables auto-update). `dateModified` and sitemap `lastmod` change only for substantive updates ([Google sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)). |
| « Dernière vérification » date | Changes **only** when a human re-verifies the fact (`verified_at`). No date-only freshening ([SEJ](https://www.searchenginejournal.com/googles-john-mueller-changing-dates-on-pages-wont-improve-rankings/401734/)). |
| Season rollover | Evergreen URLs (no year in slug). The year in H1 rolls to 2028 only when 1449H facts exist. |
| Position 4-20 with impressions | "Push list": update the page and add internal links. No new post. |
| Decay ≥ 30% clicks over 28 days (baseline ≥ 50) | Review: update or merge |
| 0 impressions after 120 days | Merge into its pillar (301), improve, or noindex |
| Offers | Banner + noindex at expiry, 301 after 30 days |
| Pillars | Re-signed by the named author every 6 months |

### 7.8 When to cut cadence

- **Automatically**, through the kill-switches (§16.5).
- **By season:** omra-ramadan drops to maintenance after Eid al-Fitr.
- **By supply:** fewer than 30 days of unique clusters left → that site's cadence halves; zero → the generator idles.
- **During a Google core or spam update rollout:** no scale-ups and no structural changes until it completes ([Search Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)).
- **Manually**, in the weekly review, whenever the sample finds an error pattern.
- **By results (positive exit, DESIGN CHOICE):** a site with 0 attributed chats in its first 6 months live, or a cost per attributed chat above the threshold you set (D21), becomes a merge or retire candidate at the next audit (§14.3).

---

## 8. Link architecture

### 8.1 Internal (per site)

- Hub and spoke: home → pillar hubs → posts. BreadcrumbList everywhere.
- Every post links to its pillar and 2-4 posts in the same cluster. Every pillar links to all its children and gets ≥ 8 internal links in.
- The build fails on orphans; every page is reachable within 3 clicks of the home page (design choice).
- New posts get a link from an already-indexed hub on day one (a discovery lever).
- One XML sitemap index + one RSS feed per language.

### 8.2 Cross-network flow map (contextual only; ≤ 1 sister link per post, `nofollow` by default)

| From | Natural sister targets (only when the reader needs them) | Max share of posts with a wikitours.ma link (all `nofollow`) |
|---|---|---|
| guideomra | omra-ramadan (Ramadan specifics), agenceomra (choosing an agency), voyageomra (packing, flights), prixomra (cost question) | 30% |
| omra-ramadan | guideomra (rituals), prixomra (Ramadan price data), voyageomra (Ramadan flights, heat) | 60% |
| agenceomra | guideomra (what an agency must provide), prixomra (« ce prix est-il normal ? ») | 30%, nofollow |
| prixomra | agenceomra (check the licence before paying), omra-ramadan (when Ramadan falls) | 20%, never inside tables |
| voyageomra | guideomra (ihram, documents), omra-ramadan | 30% |

**Network guardrails (design choices):**
- Links point to the cluster owner page, not homepages.
- From launch: a site links to any single sister on ≤ 25% of its posts per month, and ≤ 3 links per sister pair per week.
- No sitewide sister lists. One `/editeur/` page per site lists the network with `nofollow`. Cutts (2013) warned against linking all your domains in a footer [L] ([Search Engine Land](https://searchengineland.com/?p=157141)).
- Reciprocal page pairs (A→B and B→A between the same two pages) are blocked by the gate, not just warned.

### 8.3 Links to wikitours.ma

Rules in §3.5: ≤ 1 per post, share caps, **`nofollow` by default on every satellite → wikitours.ma link** (editorial sites included), **0% exact-match commercial anchors**. The value we expect is **leads and referral visits**; a followed link adds nothing to that. How Google weighs links inside a disclosed same-owner network is UNKNOWN, and even at L1 a year of followed links from new .ma domains would add up to several hundred same-owner links pointing at one money site we cannot inspect or repair. So **wikitours.ma must never depend on satellite links**. `follow` is revisited only after 6 months of clean Search Console data on wikitours.ma (M1).

### 8.4 Outbound authority links (followed — they are citations)

- **Rules:** habous.gov.ma; haj.gov.sa and the official Nusuk portal (URL to verify); Ministry of Tourism official agency list (current URL to confirm); onda.ma; royalairmaroc.com; flynas.com.
- **Context:** Hespress, Le360, Medias24, SNRTnews, TelQuel, Aujourd'hui le Maroc.
- Every rule page links its official source next to the claim.

### 8.5 External link acquisition and digital PR (Moroccan targets)

| Target | Asset / angle (own data only) | Timing |
|---|---|---|
| fr.hespress.com / hespress.com | Pre-Ramadan price snapshot; agency verification checklist | Dec, Jan |
| medias24.com | Market data story vs the 2023/2024 federation figures | Jan, Mar |
| snrtnews.com, le360.ma, telquel.ma, aujourdhui.ma, yabiladi.com | Hajj cost history; post-Ramadan report; annual report | Mar, Sep |
| Consumer protection observatory (cited by Hespress) | Offer to co-publish the verification checklist (willingness UNKNOWN) | Nov 2026 |
| wafir.ma | Ask to be included honestly in its agency comparison (wikitours.ma as the agency) | Nov 2026 |
| Trade bodies (federation, regional associations) | Member listing for Wiki Tours (public directories UNVERIFIED) | Client action |
| Wiki Tours' own channels (YouTube, TikTok, Facebook, WhatsApp) | Share satellite guides, always pointing to a verifiable page | Weekly |

**Rules:**
- No bought links, no link exchanges, no guest-post schemes. Any sponsored placement carries `rel="sponsored"` and disclosure.
- At most one data story per month. Each needs the survey threshold (40+ offers target, ≥ 8 licensed agencies, every published cell n ≥ 8) and `legal_ok`.
- Expect journalists to treat the observatory as agency content. The method page and raw CSV are what make it citable anyway.

---

## 9. GEO / AEO playbook

**Principle:** "good SEO is good GEO" (Sullivan) [L] ([Search Engine Land](https://searchengineland.com/google-danny-sullivan-good-seo-good-geo-461464)).
- AI Overviews and AI Mode need an indexed, snippet-eligible page, and nothing more technically; they use "query fan-out" ([Google](https://developers.google.com/search/docs/appearance/ai-features)), so covering adjacent questions inside a cluster probably helps (our inference; Google does not say it increases citation).
- Google does not use llms.txt; "chunking" and AI-only files are unnecessary; optimising mainly to manipulate AI answers is scaled content abuse ([Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).
- AI Overviews support Arabic ([Google](https://blog.google/products/search/ai-overview-expansion-may-2025-update/)); AI Mode lists Morocco [L] ([Google help](https://support.google.com/websearch/answer/16011537?hl=en)).
- An Ahrefs 2026 study found 38% of AI Overview citations rank in the organic top 10 (method changed vs 2025, not comparable) [L] ([DesignRush](https://news.designrush.com/ai-overview-citations-drop-ahrefs)). Ranking matters, but is not everything.

### 9.1 Answer formats

| Query type | Format on the page |
|---|---|
| « Quand… » / dates | Table: Saudi date, Moroccan date, status (prévu / confirmé), source, vérifié le |
| « Combien… » / price | Short answer citing our dataset (« médiane de N offres, captées du … au … »), table, method link |
| « Comment… » | Numbered list, one action per step, official links |
| « Qu'est-ce que… » | One-sentence definition (« La Rawdah est… »), then context, mirrored in the glossary |
| « Est-ce obligatoire… » | Oui / non / ça dépend + official rule and its date + source |

Microsoft advises descriptive headings, clear Q&A, lists and tables, and warns against key answers in tabs, PDFs or images ([Microsoft](https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers)). Static HTML puts every answer in the initial HTML.

### 9.2 Citations and own data

- Every factual statement renders with its registry source; official sources first.
- prixomra publishes dated tables + CSV (Dataset markup). **One stable URL per series**, updated in place, so citations accumulate on one page.
- A public corrections log per site; an explicit "unknowns" section on every page.

### 9.3 Speed on official moments

The fast lane (§16.3) is our main AEO lever: watcher detects a change → you approve the fact on your phone → the fact-table row and a dated changelog entry on the existing tracker are live ≤ 6 h after approval (no new post).

### 9.4 AI crawlers (robots.txt baseline, every site)

```
User-agent: *
Allow: /
Disallow: /go/

# Keep allowed (search/answer bots): Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
# PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User
# Training tokens = business choice (blocking does not remove you from their search, per vendor docs):
# GPTBot, ClaudeBot, Google-Extended, Applebot-Extended

Sitemap: https://<domain>/sitemap-index.xml
```

Vendor docs: [OpenAI](https://developers.openai.com/api/docs/bots), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-the-web-and-how-can-site-owners-block-the-crawler), [Google crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers), [Apple](https://support.apple.com/en-us/HT6619).
- **Cloudflare:** explicitly allow the search bots in the dashboard on all 8 zones (default AI-bot blocking on new domains).
- No `nosnippet`, `max-snippet`, `NOARCHIVE` or `NOCACHE` on pages we want cited ([robots meta](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)).
- Keep Search Console's "Search generative AI" setting **on** (the default) [L] ([PPC Land](https://ppc.land/google-gives-site-owners-a-toggle-to-exit-ai-overviews-and-ai-mode/)).
- No llms.txt: about 97% of llms.txt files got zero AI requests in one log study [L] ([PPC Land](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/)).

### 9.5 Bing, IndexNow, ChatGPT

- Import the 8 sites into Bing Webmaster Tools from Search Console.
- After each deploy, POST new, updated and deleted URLs to IndexNow ([IndexNow](https://www.indexnow.org/documentation)). It reaches Bing, Yandex, Seznam, Naver (and others), **not Google**.
- ChatGPT search uses third-party providers including Bing, plus OpenAI's own crawl [L] ([Windows Latest](https://www.windowslatest.com/2024/11/01/chatgpt-search-engine-uses-bing-builds-extension-to-replace-google-in-chrome/amp/)). Any public site that does not block OAI-SearchBot can appear ([OpenAI FAQ](https://help-lb.openai.com/en/articles/12627856-publishers-and-developers-faq)).

### 9.6 Schema and AI-citation tracking

Schema helps entity understanding (§4.3); there is no "AI schema", and markup must match visible text.

| Signal | Tool | Limits |
|---|---|---|
| AI Overviews / AI Mode impressions | Search Console gen-AI performance report ([Google, June 2026](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)) | API availability UNKNOWN; read in the UI weekly |
| Copilot / Bing AI citations, grounding queries | Bing AI Performance report ([Bing](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)) | No click data |
| ChatGPT referrals | `utm_source=chatgpt.com` in `/go/` logs and Cloudflare analytics referrers | Partial |
| **Monthly prompt panel** | 6 prompts per active site (FR + AR, mapped to owned clusters; draft below) + 4 entity prompts, in ChatGPT, Perplexity, Gemini, Google AI Mode, Copilot. Log cited yes/no, which URL, and whether entity answers are correct. | ≈ 30 min manual. API answers differ from consumer apps, so any API automation is only a proxy. No reliable measurement exists (UNKNOWN). Never scrape consumer UIs. |
| **Bing grounding queries per site** | Bing AI Performance report | Recorded weekly per site and compared with the site's owned clusters |

**Draft prompt panel** (prompts, not keywords; no search volume implied; refine after Semrush):

| Site | Prompts |
|---|---|
| omra-ramadan | « date limite visa omra ramadan 2027 » · « quand réserver une omra pour le ramadan 2027 depuis le Maroc » · « dates du ramadan 2027 au Maroc et en Arabie saoudite » · « omra pendant les 10 dernières nuits du ramadan 2027 » · « آخر أجل لتأشيرة العمرة رمضان 2027 » · « متى يبدأ رمضان 2027 في المغرب » |
| guideomra | « étapes de la omra pour un Marocain » · « vaccin exigé pour la omra 2027 » · « comment obtenir un permis Rawdah sur Nusuk » · « documents pour la omra depuis le Maroc » · « مناسك العمرة خطوة بخطوة » · « وثائق العمرة من المغرب » |
| agenceomra | « comment vérifier qu'une agence omra est agréée au Maroc » · « signes d'arnaque omra » · « que doit contenir un contrat omra » · « omra avec une agence ou réservation directe sur Nusuk » · « كيف أتحقق من وكالة عمرة معتمدة في المغرب » · « علامات النصب في العمرة » |
| prixomra | « prix omra ramadan 2027 Maroc » · « combien coûte une omra depuis le Maroc » · « coût final du hajj 1447 au Maroc » · « pourquoi la omra coûte plus cher pendant le ramadan » · « ثمن العمرة في المغرب » · « تكلفة الحج في المغرب » |
| voyageomra | « départ omra aéroport Mohammed V » · « vol direct Rabat Jeddah » · « liste valise omra » · « omra avec des parents âgés conseils » · « لوازم العمرة » · « رحلات مباشرة من المغرب إلى جدة » |
| Entity (4) | « Qui est Wiki Tours International ? » · « Bab Makka omra avis » · « Wiki Tours Casablanca est-elle une agence agréée ? » · « من هي وكالة Wiki Tours International ؟ » |

**Never:** hidden text for LLMs, AI-only pages, keyword-stuffed "AI summaries".

---

## 10. Technical blueprint

Third-party limits below were documented at the research cutoff (June 2026) and not re-checked today: re-verify before the build.

**Code format.** All code is JavaScript, written as **ES modules** (`"type": "module"`) in every package and in the Pages Functions, so a shared helper imports cleanly everywhere. (The tested prototypes are CommonJS; they are converted when they move into `packages/` in week 2.) The only non-JavaScript files are data and config (JSON, robots.txt, JSON-LD) and the GitHub Actions workflow YAML, which holds trigger config only: each step calls `node scripts/…`.

### 10.1 Stack and hosting

| Layer | Choice | Notes |
|---|---|---|
| Language | Node.js (JavaScript only) | Your constraint |
| Repo / CI | Private GitHub monorepo (npm workspaces), GitHub Actions | Cron runs in UTC; runs can be delayed at the top of the hour, so we use off-hour minutes [L] ([GitHub docs](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)) |
| Hosting | **Cloudflare Pages Free**, one project per site, Direct Upload via `wrangler pages deploy` from Actions | 500 builds/month, 20,000 files/site, unlimited static bandwidth [L] ([Cloudflare](https://developers.cloudflare.com/pages/platform/limits/)). We deploy only changed sites, max once per site per day (≈ 248/month max). Whether Direct Uploads count as builds is UNVERIFIED. |
| Images | Cloudflare R2 at `img.<domain>`, variants made with `sharp` (AVIF/WebP at 480/800/1200 w + 1200×630 OG JPEG) | Keeps Pages under the 20,000-file cap. R2 free tier 10 GB [L]. |
| Click log | **Wave 1:** plain `wa.me` links carrying ref codes (no server code). **From Wave 2:** Pages Function `/go/wa/<ref>` → Cloudflare D1, then 302 to wa.me | Workers free quota 100k requests/day [L]; D1 free limits UNVERIFIED |
| AI | Claude API through the official Node SDK (`@anthropic-ai/sdk`). Model name in an environment variable — no model ID in code. Batch processing for non-urgent drafts if the current API offers it (check current docs and pricing). | Monthly spend cap enforced in code. Cost per post UNKNOWN until measured. |
| Data | JSON / JSONL / CSV in the repo; SQLite (`better-sqlite3`) for BI | Git history = audit trail |
| Analytics | Cloudflare Web Analytics (cookieless) + our `/go/` click log | No cookies, no personal data on satellites |
| Not used | Netlify Free (credit plan too small, UNVERIFIED), Vercel Hobby (non-commercial use only) [L] | |

`*.pages.dev` duplicates the custom domain: absolute canonicals to the `.ma` domain plus a bulk 301 from pages.dev.

**Engine phasing (one person must maintain it).**
- **Wave 1 MVP:** static builder, facts gate, link / disclosure / licence / legal gates, sitemaps + IndexNow, and a **manual deploy** (`wrangler pages deploy`, run after review).
- **From Wave 2:** Claude claims verifier, `/go/` click log on D1, automated kill-switches, the dashboard.
- Until the kill-switches are automated, you check the same signals by hand in the weekly review.

### 10.2 Monorepo

```
omra-network/
├─ config/   network.json · sites/<domain>.json (charter, ref code, caps, theme) · authors.json (REAL people only)
│            link-policy.json · wikitours-targets.json (A6) · approved-phrases.json · killswitch.json
│            legal.json (lawyer sign-off dates → legal_ok)
├─ data/
│  ├─ facts/registry.json          # the ONLY allowed fact source (schema 10.3)
│  ├─ facts/candidates.jsonl       # watcher / survey / client proposals awaiting human approval
│  ├─ facts/kb/                    # approved ritual statements and religious texts with sources
│  ├─ semrush/raw/<YYYYMMDD>/*.csv # client exports, untouched (see SEMRUSH-BRIEF.md)
│  ├─ semrush/kgap_sets.json       # generated from the client's kgap_sets.txt
│  ├─ keywords/registry.json · keywords/decisions.jsonl · serp/<YYYYMMDD>/
│  ├─ prices/observations.csv · offers/offers.json · products/products.json (frozen)
│  ├─ gsc/<domain>/*.jsonl · inspect/*.jsonl · leads/go-clicks.jsonl · leads/refcodes.csv
│  │                               # leads: ref code, date, outcome, value band only; a CI gate rejects
│  │                               # any commit with phone-number patterns under data/leads/
│  ├─ ledger/published.json · queue/<YYYY-Www>.yml · reviews/<YYYY-Www>.json · state/cadence.json
├─ content/<domain>/<lang>/{posts,pages}/<slug>.md      # Markdown + YAML front matter (ajv-validated)
├─ themes/<domain>/                                     # distinct templates + CSS per site
├─ packages/  core · keywords · facts · generate · verify · quality · render · images · publish · monitor · bi
├─ functions/go/wa/[ref].js                             # Pages Function
└─ .github/workflows/  facts-watch.yml · generate.yml · approve.yml · publish.yml · fast-lane.yml
                       monitor.yml · weekly-report.yml · weekly-audit.yml
```

npm packages (all real): `@anthropic-ai/sdk`, `gray-matter`, `markdown-it`, `ajv`, `ajv-formats`, `csv-parse`, `sharp`, `wrangler`, `googleapis`, `better-sqlite3`, `@lhci/cli`, `ulid`.

The keyword-registry and post front-matter JSON Schemas (draft 2020-12, ajv-tested) from the tech design are in `proto/schemas/`. Front-matter additions for this plan: `tier: "A"|"B"|"C"`, `facts_used[]`, `concept_id` (shared across languages), `reviewed_by` + `reviewed_at` + `full_read: true` required to schedule any prose page (a structured check never schedules prose), `author: "org"` allowed. The registry schema's `source.report` enum now also lists `or-pages`, `or-competitors` and `serp-manual` (reference files).

### 10.3 Facts registry schema (the anti-hallucination control)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Facts registry entry",
  "type": "object", "additionalProperties": false,
  "required": ["id","topic","claim_fr","values","source_urls","source_tier","confidence","status","review_by","time_critical"],
  "properties": {
    "id": { "type": "string", "pattern": "^fact_[a-z0-9_]+$" },
    "topic": { "enum": ["ramadan_dates","umrah_season","visa","health","hajj_process","hajj_cost","prices","flights","agency_rules","fraud_cases","school_calendar","wikitours","offers","local_casablanca","other"] },
    "claim_fr": { "type": "string" }, "claim_ar": { "type": "string" },
    "values": { "type": "array", "items": { "type": "string" }, "description": "every number the claim may show, e.g. ['63021','1447']" },
    "unit": { "type": ["string","null"] },
    "source_urls": { "type": "array", "minItems": 1, "items": { "type": "string", "format": "uri" } },
    "source_tier": { "enum": ["official","media","airline","company_stated","own_data","academic"] },
    "confidence": { "enum": ["verified","likely","estimate"] },
    "required_wording": { "type": ["string","null"], "description": "rendered next to the value, e.g. 'prévu, sous réserve d’observation du croissant' or 'selon la fédération'" },
    "conflicts": { "type": "array", "items": { "type": "object", "required": ["value","source_url"],
                   "properties": { "value": { "type": "string" }, "source_url": { "type": "string", "format": "uri" } } } },
    "status": { "enum": ["proposed","approved","expired","disputed","retired"] },
    "verified_by": { "type": "string", "description": "id of the REAL person in authors.json who actually checked the source" },
    "verified_at": { "type": "string", "format": "date" },
    "review_by": { "type": "string", "format": "date", "description": "after this date the fact cannot be used in new drafts" },
    "valid_until": { "type": ["string","null"], "format": "date" },
    "time_critical": { "type": "boolean" },
    "supersedes": { "type": ["string","null"] }
  },
  "allOf": [
    { "if": { "properties": { "confidence": { "enum": ["likely","estimate"] } } }, "then": { "required": ["required_wording"] } },
    { "if": { "properties": { "status": { "const": "approved" } } }, "then": { "required": ["verified_by","verified_at"] } }
  ]
}
```

**Registry rules**
1. **No fact outside the registry gets published.** Only `approved` facts are usable. UNVERIFIED claims never enter it; they stay in `candidates.jsonl`.
2. `likely` and `estimate` facts always render their `required_wording`. `disputed` facts cannot be used. Conflicting sources are shown, not hidden (e.g. 63,021 vs 63,221 vs 63,121 MAD).
3. Default `review_by` (design choice): Saudi rules 30 days; prices 30 days; offers = `valid_until`; Hijri estimates until the official announcement; entity facts 180 days.
4. Reminder 14 days before `review_by`. Live pages using a fact past `review_by` show « information en cours de mise à jour » and are listed in the weekly report; after 14 more days unrenewed, the page leaves the sitemap until fixed.
5. Retracting or changing a fact re-renders every dependent page and adds a corrections-log entry.
6. **Licence and « depuis 2016 » are hard build blockers.** The trust block and every licence mention render only when `fact_wikitours_licence` is `approved` with `source_tier: "official"` and the ministry-list URL. Until then sites show legal name and address only. `verified_by` is filled only by the person who actually checked the source.

**Seed facts (registry v1 ≈ 60 facts, all from the research)** — examples:

| fact_id | Value | Confidence | Source | Recheck |
|---|---|---|---|---|
| fact_umrah_1448_last_visa | 9 Mar 2027 | verified | [haj.gov.sa](https://haj.gov.sa/en/Media-Center/Ministry-News/2026/Ministry-of-Hajj-and-Umrah-Announces-the-Umrah-Season-Calendar-for-1448-AH) | Monthly |
| fact_umrah_1448_last_entry | 23 Mar 2027 | verified | same | Monthly |
| fact_umrah_1448_last_departure | 7 Apr 2027 | verified | same | Monthly |
| fact_umrah_visa_entry_window | 30 days from issue | likely, « selon Gulf News » | [Gulf News](https://gulfnews.com/world/gulf/saudi/saudi-arabia-announces-new-amendments-to-umrah-visa-rules-1.500328262) | Monthly |
| fact_ramadan_1448_start_umq | ≈ 8 Feb 2027 (Umm al-Qura) | estimate | [Wego](https://blog.wego.com/ramadan-2027/) | Weekly in Jan-Feb |
| fact_morocco_ramadan_2026_offset | Morocco started 1 day after Saudi in 2026 | verified | [TelQuel](https://telquel.ma/instant-t/2026/02/18/jeudi-19-fevrier-1er-jour-du-mois-de-ramadan-au-maroc_1975833/) | — |
| fact_hajj_1447_final_cost | 63,021 MAD (conflicts 63,221 / 63,121) | verified + conflicts | [Le360](https://fr.le360.ma/societe/hajj-1447h-les-frais-definitifs-fixes-a-63021-dirhams_HFBAQQU5INGOPKRWSNL7NY2QN4/) | — |
| fact_hajj_1448_provisional | 65,000 MAD, provisional | likely | [EcoActu](https://ecoactu.ma/hajj-1447h-le-cout-fixe-a-63-021-dh-remboursement-prevu-des-le-9-mars-2026/) | Weekly in Feb-Mar |
| fact_hajj_1448_registration | 8-19 Dec 2025, habous.gov.ma, two lists, 18+, no Hajj in the last 10 years | verified | [Hespress](https://fr.hespress.com/451603-linscription-electronique-des-candidats-au-hajj-1448-h-du-8-au-19-decembre-2025.html) | — |
| fact_hajj_1447_quota | 34,000 (≈ 22,200 ministry / 11,800 agencies) | likely | [Morocco World News](https://www.moroccoworldnews.com/2026/04/288023/morocco-sets-34000-pilgrims-quota-lower-costs-digital-upgrade-for-hajj-season/) | — |
| fact_school_breaks_2026_27 | 18-25 Oct, 6-13 Dec, 24-31 Jan, 21-28 Mar, 9-16 May | verified | [Le360](https://en.le360.ma/society/2026-27-school-year-key-dates-for-students-and-teachers_ORTNN5RKQ5DYJGJHTE5ULMCDYM/) | — |
| fact_flynas_rabat_jeddah | Launched 4 Jul 2026 | verified | [flynas](https://www.flynas.com/en/media-center/news-updates/flynas-announces-the-launch-of-direct-flights-between-jeddah-and-the-moroccan-capital-rabat-starting-from-july-4th-becomimg-the-first-saudi-carrier-to-operate-direct-flights-between-the-two-cities) | Quarterly |
| fact_makkah_route_2026 | CMN (5th year) + RBA (first time), **Hajj 2026 only** | verified | [TelQuel](https://telquel.ma/instant-t/2026/05/22/hajj-2026-londa-deploie-un-dispositif-special_1991022/) | Before Hajj 2027 |
| fact_acwy_requirement | ACWY ≥ 10 days before arrival, age ≥ 1 (rule from 2025) | likely | [Gulf News](https://gulfnews.com/living-in-uae/health/umrah-2025-meningitis-vaccine-now-mandatory-for-all-pilgrims-1.500025860) | Confirm for 1448H before use |
| fact_ramadan_price_avg_2023_2024 | ≈ 25,000 MAD (2023), ≈ 35,000 MAD (2024) | likely, « selon la fédération » | [Medias24](https://medias24.com/2024/04/03/omra-2024-inflation-situation-geopolitique-et-secteur-informel-ont-fait-chuter-le-nombre-de-pelerins/) | — |
| fact_wikitours_licence | ODV-25012 | status **`proposed` (not usable)**; source_tier `company_stated` | The wikitours.ma page where the number appears (URL to record; which page is UNKNOWN) | Usable only after A2, as `official` with the ministry-list URL |
| fact_wikitours_since_2016 | Operating since 2016 | status **`proposed` (not usable)**; `company_stated` | Same rule: the wikitours.ma page that states it | Usable only with an official or documentary source |
| fact_morocco_ramadan_utc_2027 | Morocco moves to UTC+0 during Ramadan 1448 | status **`proposed`**; tzdata 2025b predicts it (local test) | Government announcement (watcher) | Approved only when the government announces the dates |

### 10.4 Facts gate (tested) and generator sketch

```js
// packages/quality/facts-gate.js — tested (19 facts-gate cases pass, incl. gender/plural/Arabic-prefix regressions; Node 22)
// Blocks publishing when a sentence has a digit or a rule word but cites no approved fact,
// when a cited fact is unknown / not approved / past review_by / expired,
// or when a number in a sentence is not a value of the fact(s) it cites.
const MARK = /\[\[fact:([a-z0-9_]+)\]\]/g;
const NUM = /[0-9٠-٩]+(?:[ ., ][0-9]{3})*(?:[.,][0-9]+)?/g;
// Unicode-aware stems: JS \b is ASCII-only, so "garantie", "interdite", "requise" used to slip through.
// "visa" also matches "visage": an accepted false positive (it only sends a sentence to review).
const CLAIM_WORDS = /(?<!\p{L})(obligatoir|interdi|exig|requi[st]|requier|gratuit|garanti|rembours|quota|visa|vaccin|d[ée]lai|date limite)\p{L}*|(?<!\p{L})(?:[وفبل]?ال)?(واجب|ممنوع|إلزامي|الزامي|مجاني|تأشير|مضمون|مسترجع)\p{L}*/iu;
const AR_DIGITS = s => s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
const norm = s => AR_DIGITS(String(s)).replace(/[ ., ](?=\d{3}\b)/g, '').replace(',', '.');
const splitSentences = t => t.replace(/\n+/g, ' ').split(/(?<=[.!?؟])\s+/).map(s => s.trim()).filter(Boolean);

export function factsGate(text, registry, { today = new Date().toISOString().slice(0, 10), approvedPhrases = [] } = {}) {
  const errors = [];
  for (const sentence of splitSentences(text)) {
    const ids = [...sentence.matchAll(MARK)].map(m => m[1]);
    let bare = sentence.replace(MARK, '');
    for (const p of approvedPhrases) bare = bare.split(p).join('');   // e.g. "les 10 dernières nuits"
    const nums = (bare.match(NUM) || []).map(norm);
    if (!ids.length) {
      if (nums.length) errors.push({ rule: 'digits-without-fact', sentence: bare });
      else if (CLAIM_WORDS.test(bare)) errors.push({ rule: 'rule-word-without-fact', sentence: bare });
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
```

The gate runs on title, meta description, H1, body, table cells, FAQ, schema text and image alt text (the elements Google's 1 Oct 2026 guidance names).

**Before launch:** seed `approved-phrases.json` from the religious knowledge base (ritual counts, step numbers, fixed expressions such as « les 10 dernières nuits »), run the gate on 20 real drafts, and set the gate-failure kill-switch threshold from that measured baseline. Until then the 25% figure in §16.5 is a placeholder.

```js
// packages/generate/draft.js — sketch; verify the call shape against the current Claude API / SDK docs.
// The generator sees only the brief + approved facts. It has no browsing tool.
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic(); // ANTHROPIC_API_KEY from GitHub secrets

export async function draft(brief, approvedFacts) {
  const res = await client.messages.create({
    model: process.env.CLAUDE_MODEL,            // set in config; no model ID in code
    max_tokens: 8000,
    system: 'Write for Moroccan pilgrims in Moroccan French (or Modern Standard Arabic if lang=ar). ' +
            'Use ONLY the facts provided. After every factual sentence add [[fact:<id>]]. ' +
            'If a needed fact is missing, write [[MISSING: description]] instead of guessing. ' +
            'Never invent prices, dates, rules, names, quotes or seat counts. Never write Qur\'an, hadith or du\'a text. ' +
            'Apply each fact\'s required_wording verbatim. Use only the URLs listed in the brief.',
    messages: [{ role: 'user', content: JSON.stringify({ brief, facts: approvedFacts }) }],
  });
  return res.content.filter(b => b.type === 'text').map(b => b.text).join('');
}
```

A draft that fails any gate gets one automatic revision; if it fails again it is discarded and logged, and its `[[MISSING]]` requests become fact candidates for the weekly review.

### 10.5 Scheduling (UTC, off-hour minutes)

| Workflow | Trigger | Does |
|---|---|---|
| facts-watch | `11 */6 * * *` | Fetches the monitored official pages (respecting robots.txt), hashes and diffs them, extracts candidate facts with the Claude API into `candidates.jsonl` (page text passed as untrusted data, §10.10), and sends a phone alert for time-critical changes (e.g. a Hajj registration announcement). Never auto-approves. |
| generate | `13 1 * * *` | Picks clusters that have enough approved facts, builds briefs, drafts, verifies, runs gates, adds passing drafts to next week's queue + preview deploy |
| approve | on push to `queue/*.yml` | Moves approved items to `scheduled` |
| publish | `17 5 * * *` | 06:17 Morocco time (UTC+1); 05:17 during Ramadan if Morocco moves to UTC+0 as tzdata predicts [V for tzdata 2025b only; the actual dates are set by government announcement, tracked as `fact_morocco_ramadan_utc_2027` with a watcher]. Publishes approved due posts under the cadence cap and kill-switch state, builds changed sites only, post-build checks, `wrangler pages deploy`, IndexNow, ledger |
| fast-lane | `workflow_dispatch` (button on phone) | Adds the newly approved fact to the tracker's table and dated changelog (no new post), gates it, deploys (target ≤ 6 h after approval) |
| monitor | `41 3 * * *` | Search Console pulls, URL Inspection sample, `/go/` logs, link-target check, spend check, kill-switch evaluation, alerts |
| weekly-report | `23 18 * * 0` | One-page report + approval digest, ready Monday morning |
| weekly-audit | `23 2 * * 0` | External link check, stale-year scan, offer expiry, decay, cannibalisation |

### 10.6 Indexing

- XML sitemap index per site (yearly post sitemaps + pages + per language) with **honest `lastmod` only**; submitted once via the Search Console API. No sitemap ping (deprecated), **no Indexing API**.
- RSS feed per language (last 50 items).
- At launch: URL Inspection "request indexing" for the home page + 3 pillars per site, once. Repeat requests do not help ([Google](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)).
- New posts linked from already-indexed hubs. IndexNow on every deploy. Bing import.
- Expectation: crawling takes days to weeks; Mueller says most good content is indexed within about a week [L]. A rising "crawled – currently not indexed" share can mean Google sees pages as too similar or low value [L] ([SEJ](https://www.searchenginejournal.com/google-explains-crawled-not-indexed/521311/)) — tracked per site as a kill-switch.

### 10.7 Performance

- Targets at p75: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 ([web.dev](https://web.dev/articles/vitals)). New sites have no field (CrUX) data, so CI uses Lighthouse lab numbers.
- Budget: zero JS by default (exceptions: theme toggle, ~1 KB click beacon), inline critical CSS, 1 preloaded WOFF2 font, mobile page ≤ 300 KB excluding below-fold images.
- `<picture>` AVIF → WebP → JPEG, srcset 480/800/1200 + sizes, explicit width/height. LCP image eager with `fetchpriority="high"`; all others `loading="lazy" decoding="async"`.
- Hero art: generated geometric (zellige-style) SVG per site — distinct, light, no fake photos.

### 10.8 Arabic RTL

- `<html lang="ar-MA" dir="rtl">` under `/ar/`; one stylesheet built on CSS logical properties (`margin-inline-start`, `padding-inline`, `text-align: start`); only direction icons mirrored ([W3C](https://www.w3.org/International/questions/qa-html-dir)).
- Self-hosted Arabic subset fonts (e.g. Amiri, Noto Naskh Arabic), larger line-height, no letter-spacing on Arabic.
- `Intl.NumberFormat('ar-MA')` gives Western digits and « د.م. » [V, local test]. Hijri dates via `ar-MA-u-ca-islamic-umalqura`, always labelled « approximatif ».
- ASCII slugs under `/ar/`. hreflang only between true equivalents on the same domain, always reciprocal.

### 10.9 Merchant Center product feed — FROZEN

- **Week 1 check inside account 780069013:** is Morocco a supported target country for free listings or Shopping ads? (UNKNOWN.) Is a website already claimed? (One per account [L].)
- **Activate only if all are true:** Morocco supported; an ordering method exists (cash-on-delivery form, payment provider or WhatsApp — whether WhatsApp-only ordering is acceptable is UNVERIFIED); shipping, returns and contact pages exist; the full Wiki Tours legal identity on the site matches the account (Misrepresentation policy).
- **If activated:** one domain only (voyageomra.ma), physical goods only (ihram kits, prayer mats, bags, books), `products.xml` generated from `products.json` and fetched daily (id, title, description, link, image_link, availability, price "149.00 MAD", condition, brand or `identifier_exists=no`, shipping MA), Product + Offer JSON-LD with identical values. A tested feed generator exists in `proto/feed.js`.
- **Never** omra or Hajj packages: travel packages are unsupported outside specific Travel rails.

### 10.10 Accessibility, security and bus factor

**Accessibility (older pilgrims and their families).**
- Target: WCAG 2.2 level AA (criteria to check on w3.org; not researched in detail here).
- Design choices: body text ≥ 18 px (larger for Arabic), generous line-height, no meaning carried by colour alone, visible keyboard focus, large tap targets, answer tables readable on a phone without sideways scrolling.
- Colour contrast checked by the Lighthouse accessibility audit in CI (gate 18), including omra-ramadan's dark theme.
- RTL pages tested with real Arabic text, not placeholder text.

**Security.**
- Secrets live in GitHub Actions secrets: a Cloudflare token scoped to Pages edit only, the Claude key under its spend cap, a Search Console service account with the least access needed.
- Two-factor authentication on Google (Search Console, Merchant Center), Cloudflare, GitHub, the .ma registrar, WhatsApp Business and the Claude console, with a second trusted admin on each.
- **Prompt injection:** watched official pages go to the Claude fact extractor as quoted, untrusted data. The extractor has no tools, and its output is only a candidate that a human must approve. Bing lists prompt injection as an abuse category [L] ([SEJ](https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442)).
- **Third-party scripts:** none on the satellites. Google's back-button-hijacking policy notes that offending code can come from third-party libraries or ad scripts [V] ([Google](https://developers.google.com/search/blog/2026/04/back-button-hijacking)).

**Bus factor.**
- A one-page handover runbook in the repo: where each account is, who holds the second admin, how to pause publishing (one config flag), how to roll back a deploy, who to call. Tested once a quarter.
- If the operator disappears, the dead-man switch slows the network at 10 days and pauses it at 21 (§16.5).

---

## 11. Conversion & behavioral psychology

### 11.1 Funnel (satellite → Wiki Tours, without touching wikitours.ma)

| Stage | Satellite asset | CTA | Principle | Guardrail |
|---|---|---|---|---|
| Discover | Date tables, guides | None, or « Enregistrer la checklist » | Reciprocity: a free, complete answer | Answer first, CTA after |
| Evaluate | Price snapshot, agency checklist | « Voir les offres Bab Makka (éditeur) », below tables, on ≤ 20% of prixomra posts | Anchoring on **observed** market ranges | Ranges only from our dataset, Wiki Tours excluded from the statistics; no fake "was/now" prices; `legal_ok` |
| Decide | Ramadan deadline table | WhatsApp « Omra Ramadan 2027 – vérifier les disponibilités » | Real scarcity: the 9 Mar 2027 visa deadline is official | Seats only from dated Wiki Tours records ≤ 7 days old |
| Act | WhatsApp chat | Pre-filled message with reference code | Default effect, low friction | The button says the reader is contacting Wiki Tours |
| Reassure | Agency verification, licence, office | « Vérifiez Wiki Tours » | Authority; loss aversion about fraud | Cite cases with dates and sources; no fear-mongering |

### 11.2 WhatsApp click-to-chat with reference codes

- Format: `https://wa.me/<international number, digits only>?text=<url-encoded message>` [L: widely documented by third parties, e.g. [Dotdigital](https://support.dotdigital.com/en/articles/11331301-click-to-chat-for-whatsapp); WhatsApp's own FAQ (https://whatsapp.com/faq/en/general/26000030) was not re-checked: verify before publishing]. The user still presses send and can edit the message.
- **Reference code** `<SITE>-<page id>` at the **start** of the message so it survives edits: OR, GO, AG, PX, VO (CA, OF, RB if ever launched). Example: `[OR-0123]`.
- Keep messages short (design choice). Segment buttons: « Pour moi », « Pour mes parents », « En famille ».
- AR pages pre-fill Arabic; staff can reply in Darija.

```js
// packages/render/wa.js — builds the link. Wave 1 uses `final` directly; from Wave 2 pages use `go`
// and the final wa.me URL is written to KV at deploy.
const SITE = { 'omra-ramadan.ma': 'OR', 'guideomra.ma': 'GO', 'agenceomra.ma': 'AG',
               'prixomra.ma': 'PX', 'voyageomra.ma': 'VO' };   // CA, OF, RB only if relaunched
const MSG = {
  fr: (ref, site, topic, who) => `[${ref}] Bonjour Wiki Tours, je viens de ${site}. ${topic}${who ? ' – ' + who : ''}. Nombre de personnes : __`,
  ar: (ref, site, topic, who) => `[${ref}] السلام عليكم Wiki Tours، جئت من ${site}. ${topic}${who ? ' – ' + who : ''}. عدد الأشخاص: __`,
};
export function waLinks({ number, site, pageId, lang = 'fr', topic, who = '' }) {
  const digits = String(number).replace(/\D/g, '').replace(/^00/, '');
  if (!/^212\d{9}$/.test(digits)) throw new Error('Moroccan number in international format expected (212XXXXXXXXX)');
  const ref = `${SITE[site]}-${String(pageId).padStart(4, '0')}`;
  return {
    ref,
    go: `/go/wa/${ref}?l=${lang}&w=${encodeURIComponent(who)}`,                       // used in the page, rel="nofollow"
    final: `https://wa.me/${digits}?text=${encodeURIComponent(MSG[lang](ref, site, topic, who))}`,
  };
}
```

```js
// functions/go/wa/[ref].js — Cloudflare Pages Function (from Wave 2): log the click, then redirect. No personal data stored.
export async function onRequest({ params, request, env }) {
  const url = new URL(request.url);
  await env.LEADS_DB.prepare('INSERT INTO clicks(ref, lang, who, ts, referer) VALUES (?, ?, ?, ?, ?)')
    .bind(params.ref, url.searchParams.get('l'), url.searchParams.get('w'),
          new Date().toISOString(), request.headers.get('referer') || '').run();
  const target = await env.REFS.get(params.ref);           // precomputed wa.me URL per ref, written at deploy
  return Response.redirect(target || `https://wa.me/${env.WA_NUMBER}`, 302);
}
```

**Attribution, three levels:**
1. **Clicks by ref:** automatic, no Wiki Tours access needed.
2. **Chats, quotes, bookings by ref:** staff apply WhatsApp Business labels (one per site code) and fill a weekly sheet (C4) holding only ref code, date, outcome and value band: no names, no phone numbers. The system joins clicks and sheet rows by code. If a user deletes the code, staff ask « Comment nous avez-vous connus ? » and log the site.
3. **Optional full automation:** a WhatsApp Business Platform webhook on your number logs inbound ref codes (does not touch wikitours.ma). Cost UNKNOWN; whether the same number can stay in the WhatsApp Business app at the same time is UNVERIFIED. **Stays off until the lawyer OKs it (Loi 09-08 / CNDP, E1).**

### 11.3 Trust block (every site)

Publisher identity; licence **only after A2 proof** (number + ministry-list link; the build blocks it otherwise, gate 20); Casablanca address, hours and real office photos; named people; « Ce que nous ne promettons jamais » (no guaranteed visa, no "0% d'intérêt"); corrections log; « Vérifiez-nous aussi » link to agenceomra's method. A consumer association warned specifically about unusually low online offers [V] ([Hespress EN](https://en.hespress.com/131697-moroccan-authorities-consumer-groups-warn-against-travel-scams-amid-luxury-umrah-audit.html)) — so no "too good to be true" pricing.

### 11.4 Ethical levers

| Lever | Use | Never |
|---|---|---|
| Anchoring | Show the observed market median and range (prixomra; **Wiki Tours excluded from the statistics**) before any Wiki Tours price, which sits in its own labelled row; explain why prices differ (hotel distance, room basis, flights, season). Only with `legal_ok`: comparative-advertising rules are NOT RESEARCHED | Invented reference or "was/now" prices; a CTA inside the table |
| Real deadlines | Static deadline table: last visa 9 Mar 2027, last entry 23 Mar 2027 [V]; 30-day visa window [L] | Resetting countdown timers |
| Scarcity | Only dated Wiki Tours availability (`as_of` ≤ 7 days); Ramadan flight scarcity cited from press | « 3 places restantes » without data |
| Loss aversion | Fraud-prevention checklist citing real, dated cases | Naming agencies without an official source; fear about doing it yourself |
| Social proof | Real, consented testimonials | Fake reviews, self-review stars, invented "pilgrims served" counts |
| Commitment ladder | Checklist → question → quote → office visit → deposit | Forms collecting personal data on satellites |
| Religious framing | Respectful, factual | Religious guilt as a sales lever (scholars already object to commercialising Omra [L], [SNRTnews](https://snrtnews.com/fr/article/omra-20-quand-une-pratique-religieuse-se-commercialise-116219)) |

### 11.5 Buyer ≠ pilgrim

- **Hypothesis (no source):** children paying for their parents' Omra. Test it with buyer-facing pages and the « Pour mes parents » button: payment schedule, contract, who accompanies elderly pilgrims, health requirements for seniors (registry only), how the family gets updates (only if Wiki Tours really does this). The ref-code data tells us whether it is real.
- **Supported segments:** young adults [L] (Medias24 2025); families in summer (commercial claim by wafir.ma, UNVERIFIED).
- **Financing:** Mourabaha content states the bank margin (5.5-7% per wafir.ma, UNVERIFIED — verify with a bank source before use) and never says "0% interest".

### 11.6 Per-site UTM tracking

- Links to wikitours.ma get `?utm_source=<domain>&utm_medium=referral&utm_campaign=network&utm_content=<ref>` **only after** you confirm self-referencing canonicals on wikitours.ma (box §4.6, item 5). Until then: no UTMs; referrer only (visible in your own analytics).
- The WhatsApp ref code stays the primary attribution either way.

### 11.7 Privacy

Satellites set no tracking cookies and collect no personal data; the « Signaler une erreur » form asks for none. But the attribution pipeline does touch personal data on Wiki Tours' side: WhatsApp chats, the staff lead sheet, and the optional webhook. Morocco's Loi 09-08 and the CNDP are named for the lawyer (E1); whether a declaration or authorisation is needed is UNVERIFIED. Rules until then:
- the lead sheet holds only ref code, date, outcome and value band (no names, no phone numbers);
- the webhook option stays off;
- a CI gate rejects any commit containing phone-number patterns under `data/leads/`, because Git history is permanent.

---

## 12. Measurement & BI system

### 12.1 KPI tree

- **North star:** bookings attributed to satellites (by ref code, from the staff sheet).
- **Conversion:** WhatsApp clicks → chats → quotes → bookings, per site and ref.
- **Leading:** indexed pages, impressions on owned clusters, main-keyword positions, AI citations.
- **Guardrails:** index ratio, "crawled – currently not indexed" share, fact errors, duplicate score, gate failure rate, manual actions.
- **Efficiency:** cost per attributed booking (Claude API + editor + tools ÷ bookings). It needs a budget envelope and a kill threshold from you (D21); both are UNKNOWN today.

**No traffic targets now** — any number would be invented. Baselines are fixed after 8 weeks live, then targets are agreed.

### 12.2 KPIs per site

| Site | Primary KPI | Leading | Guardrail |
|---|---|---|---|
| omra-ramadan | Nov-Feb WhatsApp clicks and chats (OR) | Ramadan cluster positions; fast-lane latency | Date accuracy vs announcements |
| guideomra | Clicks on owned clusters; GO chats | Impressions, AI citations, fast-lane latency | Index ratio, fact errors |
| agenceomra | Links earned; AI citations on verification queries; AG chats | Impressions | Disclosure / legal compliance |
| prixomra | Data freshness (as_of ≤ 30 days), observations/month, press citations | CSV downloads, "prix omra" impressions | Every price traces to a source |
| voyageomra | Clicks; VO chats | Impressions | Index ratio |

### 12.3 Data pipeline

- **Search Console API:** a service account added as a user on each `sc-domain:` property; daily `searchanalytics.query` with dimensions date, page, query, country, device; `rowLimit` 25,000 with pagination; `dataState: 'final'` for reports and `'all'` for alerts; Morocco filter country `mar` ([API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)). Search Console keeps ≈ 16 months, so we archive from day one; anonymised queries mean query rows do not add up to totals [L]. A tested pull script exists in `proto/gsc-pull.js`.
- **URL Inspection API sample** of posts aged 14-60 days (quota 2,000/day/site [L]).
- Semrush Position Tracking weekly CSV; Bing exports; Cloudflare analytics; `/go/` clicks from D1 (from Wave 2); the staff lead sheet; ledger, gate logs, Claude usage.
- Everything lands in SQLite; a static dashboard is rebuilt daily and served behind Cloudflare Access (free ≤ 50 users [L]). Switch to the Search Console BigQuery bulk export if data grows.

### 12.4 Dashboard panels

1. Network overview (28 days vs prior 28; Morocco vs abroad)
2. Money flow: WhatsApp clicks → chats → quotes → bookings by site and ref
3. Main keywords (30 at Wave 1, up to 50 after Wave 2): top 3 / top 10 / not ranking, owner URL
4. Registry coverage: clusters assigned → briefed → published → ranking; reserved clusters
5. Push list (owner URLs at positions 4-20)
6. Cannibalisation alerts
7. Decay (≥ 30% click drop, baseline ≥ 50)
8. Indexing (coverage state of 14-60-day-old posts)
9. Production and quality: posts vs cadence level, queue days left, gate failures by reason, mean similarity
10. Facts: proposed, expiring ≤ 14 days, disputed, conflicts
11. AI visibility log (GSC gen-AI, Bing AI, chatgpt.com referrals, monthly panel)
12. Season calendar with deadlines and fast-lane readiness
13. Spend (Claude API month-to-date vs cap; files per site vs 20k cap)
14. Money-site track (M1-M10 status; wikitours.ma Search Console data once added)

### 12.5 Rank and AI-visibility tracking

Semrush Position Tracking weekly (Morocco, mobile first; city targeting UNVERIFIED; project limit of your plan UNVERIFIED). AI visibility per §9.6.

### 12.6 Weekly review ritual

The exact weekly checklist (≈ 75-90 min) and the report template are in §16.6 and §16.7.

---

## 13. Roadmap

**Owners:** **E** = engine/build (us). **C** = client. **WT** = Wiki Tours staff.

### 13.1 Week by week: 2026-10-20 → Ramadan (≈ 2027-02-08)

| Wk | Dates | Build / ops (E) | Client / staff (C, WT) | Content / gates |
|---|---|---|---|---|
| 1 | Tue 20 – Sun 25 Oct | Repo, Cloudflare projects, GitHub, Claude API key with cap, Search Console service account, Bing import, robots + Cloudflare AI-bot allowances. Wayback/whois history of the 8 domains. Facts registry v0 (≈ 60 facts from the research). Site charters + topic map v1 with `concept_id`s. Launch pages entered in the registry and run through the cannibalisation guard. | P0 inputs start (A1-A7, B1, B4, D1-D6, E3, M1). Decisions D1-D5, D19. Written P0 checklist shared. Confirm .ma registrant data with registrar. | Draft Wave 1 pillars |
| 2 | 26 Oct – 1 Nov | **Engine MVP only** (§10.1): static builder, facts gate, link / disclosure / licence / legal gates, sitemaps, IndexNow, manual deploy, `/editeur/` pages. Wave 1 themes. Ingest Semrush R0/R2 and the manual SERP CSV. D1 SERP-overlap check. **Merchant Center country check.** | Semrush R0 + R2 + Step 7 by **Wed 28 Oct**. **All P0 inputs by Fri 30 Oct**, incl. wikitours.ma in Search Console (M1). Facts v1 approval. | Topic map signed |
| 3 | 2 – 8 Nov | Facts gate run on 20 real drafts; approved phrases seeded from the religious KB; kill-switch threshold calibrated. | **Launch review of Wave 1 pillars (≈ 20 FR pages, ≈ 5-7 h).** Price survey #1 starts (C3). Rest of Semrush by Sun 8 Nov. | **P0 go / no-go: Fri 6 Nov** |
| 4 | 9 – 15 Nov | **Wave 1 plan date 9-15 Nov** (omra-ramadan, guideomra, agenceomra pillars), only if the P0 checklist is complete; otherwise it moves week by week. Sitemaps submitted, URL Inspection for home + 3 pillars per site, IndexNow. Remaining Wave 1 pages follow after review (≈ 5-7 h). | **First weekly ritual (≈ 75-90 min).** M2: Ramadan 2027 Bab Makka page live by Sun 15 Nov. | L0 → L1 (with editor) or L1a (owner only) on Wave 1 |
| 5 | 16 – 22 Nov | Wave 2 pillars drafted. Claims verifier, `/go/` click log and automated kill-switches built. habous.gov.ma watcher armed for 1449H. | Ritual. Survey continues. **Decide omrarabat, offresomra and omracasablanca (default: keep the 301s) by 22 Nov.** Lawyer brief (E1). | Agency checklist PR pitch |
| 6 | 23 – 29 Nov | Survey threshold check (40+ offers target, ≥ 8 licensed agencies; licence-list URL known). Kill-switch dry run. | Ritual. Wave 2 review (≈ 24 pages, ≈ 6-8 h of named-reviewer time). Lead sheet starts (C4). | — |
| 7 | 30 Nov – 6 Dec | **Wave 2 target early Dec** (voyageomra; prixomra only if threshold met, licence-list URL known and `legal_ok`). Dashboard live. Semrush refresh (≈ 10 weeks before Ramadan). **Fast-lane drill** (simulated announcement). | Ritual | L1 network ≈ 16/week (with editor) |
| 8 | 7 – 13 Dec | School break 6-13 Dec. Rajab ≈ 10 Dec [E]. | Ritual + fast-lane approvals if Hajj 1449H is announced (1448H was 8-19 Dec) | **PR: Ramadan 2027 price snapshot.** Hajj timeline published on announcement (GO). |
| 9 | 14 – 20 Dec | First 4-week health review of Wave 1 (no unlock before 4 green weeks) | Ritual | Winter family Omra |
| 10 | 21 – 27 Dec | Refresh Ramadan pillars with any Saudi updates. Buffer ≥ 7 days approved. | Ritual | — |
| 11 | 28 Dec – 3 Jan | Monthly report; fact renewals; stale-year scan at year rollover | Ritual. Survey #2. Photos/testimonials batch. | — |
| 12 | 4 – 10 Jan | **Unlock decision for Wave 1** (L1 → L2 only if criteria met and review hours exist) | Ritual (+ editor hours review) | Fasting-and-Omra guide; visa timing explainer. Sha'ban ≈ 9-10 Jan [E]. |
| 13 | 11 – 17 Jan | — | Ritual | Snapshot #2 |
| 14 | 18 – 24 Jan | Unlock decision for Wave 2 sites | Ritual | **PR: pre-Ramadan price update** |
| 15 | 25 – 31 Jan | Ramadan "live mode" templates (Saudi and Moroccan moon-sighting slots, two-scenario date pages) | Ritual | School break 24-31 Jan: pre-Ramadan family Omra |
| 16 | 1 – 7 Feb | **Freeze** new launches and template changes. Fast lane on standby. Moon-sighting watcher armed. | Ritual + standby for approvals | Live date page ready |
| 17 | 8 – 14 Feb | **Ramadan 1448 begins (≈ 8 Feb Saudi; Morocco possibly +1 day) [E].** Live updates. | Fast-lane approvals | Live log (OR) |

### 13.2 Month by month: Feb → Dec 2027 (incl. the Hajj 2028 / 1449H cycle)

| Month | Network | Hajj 1449H / 2028 cycle [U unless noted] |
|---|---|---|
| Feb 2027 | Ramadan live mode. No cap increases, no launches during Google updates. | If registration happened in Nov-Dec 2026, a lottery could follow around Feb-Mar (1448H: Dec registration, Mar lottery [V]) |
| Mar 2027 | Eid ≈ 9-10 Mar [E]. Visa closes 9 Mar, entry closes 23 Mar [V]. Post-Ramadan price report (PR). **Wave 3 decisions** (offresomra if client + lawyer yes; omrarabat if Rabat confirmed; omracasablanca stays a 301 unless D20 changes). Quarterly Semrush. | Hajj 1448H final cost possible (1447H: 3 Mar 2026) → same-day update (PX, GO) |
| Apr 2027 | Last Omra departure 7 Apr [V]. Hajj logistics (VO). omra-ramadan to maintenance. Q2 review. | 1448H departures. 2026 reference: Moroccan outbound flights 1-21 May and 78 return flights 31 May-18 Jun, per a search summary of [TelQuel, 9 Jun 2026](https://telquel.ma/instant-t/2026/06/09/hajj-1447-plus-de-11-000-pelerins-marocains-deja-rentres-78-vols-prevus-au-retour_1993201/) [L]. The "18 Apr-21 May" range quoted elsewhere appears to be the Saudi arrival window from a travel blog [U], not Moroccan flight dates |
| May 2027 | Hajj explainers (GO). Summer Omra content once the Saudi 1449H calendar is out. **Hajj domain decision** (§17). | Hajj 1448H itself (Arafah ≈ 15-16 May [E]) |
| Jun 2027 | Summer family Omra, heat safety, summer price snapshot. **Half-year audit:** keep / merge / redirect each site; cadence level; cost per booking. | 1449H payment window possibly Jun-Jul (1448H: 29 Jun – 10 Jul 2026 [L]) |
| Jul 2027 | Summer departures. 2027-28 school calendar into the registry. | — |
| Aug 2027 | Ramadan 2028 dates explainer (draft). Mawlid ≈ 14-15 Aug [E]. | Watch for Hajj 1450H/2029 registration (trend [U]) |
| Sep 2027 | Annual « état des prix de la Omra » (PR). Ramadan 2028 pages refreshed. Quarterly Semrush. | — |
| Oct 2027 | Ramadan 2028 booking window: repeat the Oct 2026 playbook with 12 months of data. | — |
| Nov 2027 | Ramadan 2028 decision period; Semrush pre-season refresh. | Possible 1450H registration [U] → fast lane |
| Dec 2027 | Year review: pillar re-signs, portfolio decision, cadence level for 2028. | Hajj 1449H itself falls in spring 2028 (dates not researched) |

---

## 14. Risks, kill-switches & contingency

### 14.1 Kill-switches (summary)

Automatic scale-down when indexing, impressions, similarity, gate failures, fact errors or a manual action turn bad; a dead-man switch if the weekly review is skipped. Full table and tested code in §16.5. **Every resume from "paused" or "frozen" is a human decision.**

### 14.2 Risk register and penalty scenarios

| # | Scenario | Likelihood | Impact | Early signal | Automatic response | Human response |
|---|---|---|---|---|---|---|
| 1 | Manual action "scaled content abuse" on a satellite | Medium (high if volume outruns review) | High | Search Console email | **Network freeze**: generation and publishing stop on all sites | Audit; delete or noindex low-value pages; consolidate clusters; document fixes; reconsideration request. If not salvageable, **retire or noindex** the site. **Never 301 it to wikitours.ma.** Recovery: months, not guaranteed [L] ([SEL](https://searchengineland.com/google-danny-sullivan-algorithm-update-recovery-uncertain-446317)) |
| 2 | Algorithmic demotion of the network in a spam/core update | Medium | High | Impressions fall on several sites in the same update window | Slow/pause per site; ≥ 2 sites crashing → network freeze | Find the shared pattern (templates, overlapping intents, links). Prune. Consider the consolidation plan (§14.3). Several months at least [L] (Gabe) |
| 3 | Doorway classification ("Google shows only one, or demotes all" — Mueller [L], [SEJ](https://www.searchenginejournal.com/google-multiple-sites-ip-not-problem-similar-content/254799/)) | Medium | High | Only one satellite ranks per query family | — | Merge overlapping sites into the strongest; sharpen distinct jobs |
| 4 | Unnatural-links action (satellite outbound, or wikitours.ma inbound — we can't see its Search Console) | Low-medium | Very high for wikitours.ma | Search Console email; your report | Links to wikitours.ma are already `nofollow`; if needed, all of them are removed in one build within 24 h of your report | You handle wikitours.ma in its own Search Console (M1) |
| 5 | Wrong fact published (visa, price, Hajj rule) | Medium | High (trust, legal) | Watcher diff, reader report, weekly sample | That content type pauses on that site; dependent pages re-render with a visible correction note | Fix the fact; find the root cause; add a gate rule |
| 6 | Saudi or Moroccan rule change mid-season | Medium | Medium | Watcher | Topic blocked for new briefs until a human updates the fact | Fast lane, same day |
| 7 | Hijri date shift | Certain to vary | Low | Moon sighting | Two-scenario pages flip status to « confirmé » | Approve the fact by phone |
| 8 | Wiki Tours licence not on the official list | Unknown | Very high | A2 check | The licence never renders until the official-tier fact exists (gate 20) | **Check pending:** launch with legal name and address only; prixomra stays blocked. **Check shows Wiki Tours is not listed:** launch blocked until resolved (a site teaching readers to check the list cannot come from an agency missing from it) |
| 9 | Legal complaint from an observed agency | Low-medium | Medium | Email / WhatsApp | — | Correction / right-of-reply procedure: answer within 48 h; hide the item pending lawyer review if disputed; log the outcome; keep the method page |
| 10 | Impersonation (scammers copying sites or brand) | Medium | Medium | Brand alerts, user reports | — | Brand-defence domains (§17); report to host and registrar; "Vérifiez-nous" pages |
| 11 | Bad domain history found | Unknown | High | Wayback/whois in week 1 | — | Do not build on it; redirect or drop |
| 12 | wikitours.ma URL changes or goes down | Medium | Medium | Weekly target check | Link removed, WhatsApp CTA stays, alert | You fix it |
| 13 | Leads unanswered | Medium | High | Clicks up, chats flat | Alert | Staffing, greeting/away message |
| 14 | Claude API outage or cost spike | Low-medium | Low | Errors, spend | ≥ 7-day approved buffer keeps publishing; generation stops at cap | Adjust cap |
| 15 | Flight / geopolitical disruption | Medium | Medium | News, airline pages (e.g. RAM suspended Doha/Dubai flights in early 2026 [V], [Medias24](https://medias24.com/2026/03/27/royal-air-maroc-prolonge-la-suspension-de-ses-vols-vers-dubai-et-doha-jusquau-15-avril-1649760/)) | Watcher alert | Honest status notes |
| 16 | Agencies bypassed (Nusuk direct booking, multiple-entry visa) | Medium | Medium | News | — | Content explains honestly what an agency adds; never claims DIY is impossible |
| 17 | Weekly review skipped | Medium | High | No sign-off | Dead-man switch: slow at 10 days, pause at 21 | Do the review |
| 18 | Topic supply runs out | Likely | Low (good) | Guard blocks duplicates | Cadence falls naturally; never backfills | Accept lower volume |

**Firewall:** wikitours.ma never depends on satellite links; link volume to it stays small and 0% exact-match.

### 14.3 Consolidation plan (kept ready, not planned)

If **two or more sites are hit**, or Google treats the network as one doorway set, consolidate to **3 sites** with 301s (content is portable Markdown):
- **guideomra.ma** absorbs omra-ramadan (as `/ramadan/`) and voyageomra logistics (incl. the CMN and Rabat-Salé sections);
- **prixomra.ma** absorbs offers;
- **agenceomra.ma** stays.

Rules: move only content that passes a fresh audit; a site under an unresolved **manual action** is retired or noindexed, not redirected (whether problems transfer through a 301 is UNKNOWN); nothing is ever redirected to wikitours.ma as part of a penalty response. This follows Mueller's view that a single web presence probably performs better [L].

### 14.4 Incident playbook

| Incident | Who | First hour | Within 24-48 h | Where it is shown |
|---|---|---|---|---|
| Wrong fact live (worst case: during Ramadan) | You + editor | Fact set to `disputed`; dependent pages re-render with a correction note; WhatsApp staff get the correct answer | Corrections-log entry with date and source; root cause and a new gate rule; if readers may have acted on it, a WhatsApp message to affected leads (your decision) | Corrections log of each affected site |
| Brand impersonation (fake site, WhatsApp number or social page) | You | Warning on `/editeur/` and the « Vérifiez-nous » pages; reply script for staff | Report to the host, registrar and platform; tell the consumer observatory if people lost money (your decision) | wikitours.ma + all satellites |
| Google manual action | You | Network freeze (automatic) | Audit and written fix plan; reconsideration only after fixes (§14.2 #1) | Search Console |
| Complaint from an observed agency | You + lawyer | Acknowledge; hide the item if disputed | Answer within 48 h; publish the correction or right of reply; log it | prixomra / agenceomra corrections log |

---

## 15. Open questions / decisions for the client

If there is no answer by the date shown, the default applies.

| # | Decision | Default | By |
|---|---|---|---|
| D1 | Hajj registration content: wikitours.ma keeps "inscription via agence / quota"; guideomra publishes only the **official 1449H timeline** and links to the wikitours.ma post. Final only after the FR + AR SERP-overlap check (§4.2) | Yes (this split); if overlap ≥ 4/10, guideomra shows only a dated official-facts table without « inscription » in title or H1 | 30 Oct |
| D2 | Disclose Wiki Tours ownership on all sites | **Yes** (I won't build hidden ownership) | 30 Oct |
| D3 | Confirm or correct our two ASSUMPTIONS (we have no access to wikitours.ma; you want full automation with about one weekly check), and accept the cadence ladder (owner only ≈ 3-4 prose posts/week; L1 ≈ 12-16/week with an editor; 24/day only as a ceiling) | Assumptions stand; ladder applies | 30 Oct |
| D4 | Approve the **fast lane** (5-minute phone approval, same day, for official announcements)? | Without it, updates wait for the weekly review and competitors are first | 30 Oct |
| D5 | Monthly Claude API spend cap (amount) | Required before generation starts | 30 Oct |
| D6 | Is there a real Rabat presence or RBA departures sold by Wiki Tours? | No → omrarabat.ma keeps its 301 to voyageomra's Rabat-Salé section | 22 Nov |
| D7 | offresomra.ma: list other licensed agencies' public offers (needs lawyer OK)? | No → keeps its 301 to the Bab Makka page; revisit Mar 2027 | 22 Nov |
| D8 | Who are the named authors, the religious reviewer and the Arabic reviewer? | Organisation byline; ritual pillars held until a reviewer exists | 6 Nov |
| D9 | Who runs the monthly price survey? | prixomra waits for an owner | 6 Nov |
| D10 | Part-time Moroccan editor, ≈ 5-6 h/week (E3)? | No editor → owner-only volume (≈ 3-4 prose posts/week) | 30 Oct |
| D11 | Auto-publish lane for **prose** without per-post approval? Below Google's 1 Oct 2026 guidance; needs written risk acceptance and 8 green weeks; only for rule-free, number-free page types | **Off** | — |
| D12 | Root language FR or AR per site | FR root, AR for pillars + proven-volume clusters | After Semrush |
| D13 | Block AI **training** bots (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended)? | Allow (business choice; search bots always allowed) | 6 Nov |
| D14 | Merchant Center: proceed only if Morocco is supported + ordering method + matching identity? | Frozen | W2 check |
| D15 | Buy brand-defence domains as redirects (§17)? A Hajj keyword domain is not recommended now (revisit Jun 2027) | Recommended for brand defence only; each 301 after a clean history check | Nov |
| D16 | Share satellite guides weekly on Wiki Tours social channels? | Yes | Nov |
| D17 | Paid search for Ramadan 2027 head terms pointing to wikitours.ma? Outside this SEO scope; the only guaranteed Ramadan 2027 visibility. Travel-ads rules UNKNOWN. | Your call | Nov |
| D18 | Diaspora (MRE) audience abroad? | Revisit with Search Console country data (demand UNKNOWN) | Jun 2027 |
| D19 | omra-ramadan structure: keep the trimmed domain, or run Ramadan as `guideomra.ma/ramadan/` and 301 omra-ramadan.ma until it has a distinct live asset (§5.1)? | Keep the trimmed domain | 30 Oct |
| D20 | omracasablanca.ma: keep the hold (301 to voyageomra's CMN section), or run it under the strict rules in §5.6? | Hold | 22 Nov |
| D21 | Budget envelope and kill threshold: Claude API (cost per post UNKNOWN until measured), part-time editor, lawyer, Semrush plan tier, licensed SERP data, Cloudflare/D1; and the cost per attributed booking (or chat) above which a site is merged | No scale-up beyond L1 until set | 30 Nov |
| D22 | Social / video / WhatsApp content plan. YouTube had the largest social ad audience in Morocco in Jan 2024 per a Statista/DataReportal citation in an agency blog [U] ([Affect Group](https://affectgroup.com/blog/morocco-tiktok-audience-by-age-and-gender/)); scammers use the same channels | D16 only (share satellite guides, always pointing to a verifiable page). A full plan is outside this document | Dec |

### 15.1 Open evidence gaps (not filled in this version)

- **Semrush features** in the brief (Questions tab, Broad match, Keyword Gap tabs and domain limit, Organic Research Pages/Competitors exports, Position Tracking city targeting for Morocco, subfolder analysis by plan) were not re-checked live. Only filter logic and Morocco ('ma') data were searched.
- **Hosting and CI limits** (Cloudflare Pages / R2 / Workers / Access, Netlify credits, Vercel Hobby, GitHub Actions) are at the June 2026 knowledge cutoff. Re-verify before the build.
- **2026 policy items** (1 Oct 2026 gen-AI fact-check guidance, deceptive authorship update, September 2026 spam update, Search Console gen-AI setting and reports, Bing AI Performance report) rest mostly on secondary sources and were not re-searched.
- **wikitours.ma facts** (licence ODV-25012, "since 2016", Bab Makka URLs) are company-stated only.
- **Moroccan law** (Law 11-16 licence categories, Loi 31-08, Loi 09-08 / CNDP, .ma registration terms) is NOT RESEARCHED. The legal review (E1) is still required.
- **Domain history** of the 8 domains (Wayback, whois, backlinks): scheduled for week 1, not done yet. Every redirect decision depends on it.
- **Competitor / SERP landscape:** 5 of about 20 searches, US-only tool; no Moroccan agency competitor named (Step 7 and R2 are P0).
- **WhatsApp usage in Morocco** at platform level: UNKNOWN.
- **Mueller on posting frequency** is known through SEJ's report only; the original statement was not found.

---

## 16. Automation & weekly operating system

### 16.1 End-to-end pipeline

```
 SEMRUSH CSV ──┐                                          OFFICIAL SOURCES (watchers, every 6 h) ──┐
 GSC QUERIES ──┼─► KEYWORD REGISTRY ─► clusters ─► site assignment       PRICE SURVEY (monthly) ───┼─► FACT CANDIDATES
 WHATSAPP Qs ──┘     (reserved: wikitours.ma)         │                  CLIENT OFFERS (weekly) ───┘        │
                                                      ▼                                                     ▼
                                              cannibalisation guard        HUMAN: approve facts (weekly, or FAST LANE by phone)
                                                      │                                                     │
                                                      ▼                                                     ▼
                                   brief = cluster + template + ALLOWED URLS + APPROVED FACTS ◄──── FACTS REGISTRY
                                                      │
                                   Claude API draft ([[fact:id]] markers) ─► Claude API verifier (claims → fact ids)
                                                      │
                                   21 deterministic gates (facts, religious text, similarity, links, disclosure, legal, licence…)
                                      fail ─► 1 auto-revision ─► fail ─► discard + log (+ MISSING → fact candidate)
                                                      │ pass
                        ┌─────────────────────────────┴──────────────────────────────┐
                 PROSE (tier A/C)                                         DATA VALUES ONLY (tier B: table cells,
                        ▼                                                 fact-table rows on stable URLs, approved records)
     APPROVAL QUEUE queue/<YYYY-Www>.yml + preview + digest                          │ (auto)
                        ▼                                                            │
     HUMAN full read of every prose post (editor/owner; named sign-off tier A)       │
                        └─────────────────────────────┬──────────────────────────────┘
                                                      ▼
                     SCHEDULE QUEUE (≥ 7-day buffer) ─► publish 05:17 UTC (cap × kill-switch state)
                                                      ▼
                     build changed sites ─► post-build checks ─► Lighthouse ─► deploy (Cloudflare Pages)
                                                      ▼
                     sitemaps · RSS · IndexNow · ledger
                                                      ▼
   MONITOR (daily): GSC · URL Inspection sample · Bing · /go/ clicks · link targets · spend · gate stats · status dashboard
                                                      ▼
                     KILL-SWITCH ENGINE ─► state/cadence.json (read by next run) + ALERTS (phone / email)
                                                      ▼
                     WEEKLY REPORT (Sunday) ─► HUMAN 75-90-min ritual (Monday) ─► signed review (resets dead-man switch)
```

### 16.2 Facts registry operations

- **Single source:** the generator receives only fact IDs and values relevant to its brief. No browsing during generation.
- **Proposals:** watchers, the price survey and your offer sheet create candidates. **Never approved automatically.**
- **Approval:** a GitHub pull request or a mobile-friendly approval page: you check the source link and the value, then approve (≈ 1-2 min per fact, estimate).
- **Change propagation:** a changed value re-renders every dependent page; fact tables auto-update; prose paragraphs go to the approval queue.

### 16.3 The fast lane (official announcements)

1. Watcher detects a change on habous.gov.ma, haj.gov.sa or another monitored page — or you spot it — and sends a **phone alert** with the source link and the proposed fact.
2. You approve the fact (≈ 5 minutes).
3. The approved fact updates the tracker **in place**: the fact-table row changes and a dated changelog entry is added on the existing stable URL. **No new post, no free AI prose.** Any explanatory prose goes through the normal approval queue.
4. Published via the manual **run** trigger (`fast-lane.yml`). **Target: live ≤ 6 h after approval** (design choice).
5. A **quarterly simulated drill** checks the lane works (first drill: week 7).

The weekly report has a « fast-lane readiness, next 14 days » line listing expected announcements.

### 16.4 What stays human (non-negotiable) — and the honest risk statement

| Task | Who | Time (ESTIMATE) | Why it cannot be automated |
|---|---|---|---|
| Approve / renew facts | You (or one named person + backup) | 10-15 min/week | The anti-hallucination control itself |
| **Full read of every prose post** before it is scheduled | Part-time editor at L1 (≈ 12-16 posts); you at owner-only volume (3-4 posts) | ≈ 15 min/post: editor ≈ 3-4 h/week of the 5-6 h; you ≈ 45-60 min/week in owner-only mode | Google's 1 Oct 2026 fact-check guidance; `reviewed_by` means a full read |
| Read flagged items (pillars, prices, visa/Hajj rules, Wiki Tours mentions) and sign off the batch | You | 20-30 min/week | Final accountability |
| Random sample of published posts (6-question rubric) | You | 10 min/week | Catches what gates miss |
| Report, Search Console check, leads, decisions, money-site track | You | ≈ 15 min/week | — |
| Fast-lane approvals | You | 5 min per event, same day | Official announcements |
| Kill-switch decisions (resume, escalate) | You | 5 min/week | Reversals need judgement |
| Named sign-off on pillar / rule / ritual pages | Named staff | ≈ 15-20 min/page at launch, then every 6 months | Real accountability (E-E-A-T) |
| Arabic pages | Arabic reviewer | ≈ 15-20 min per AR page: ≈ 4-5 h at launch, then ≈ 1 h/week at L1 | Arabic quality; AR never publishes unread |
| Religious knowledge base and ritual pages | Religious reviewer | ≈ 3-4 h at setup, then ≈ 15-20 min per ritual page and a yearly review | Religious accuracy |
| Monthly price survey with proof | Staff or assistant | 2-8 h/month | Original data, judgement |
| Wiki Tours offers sheet | Staff | ≈ 20 min/week | Real availability and prices |
| Real photos, field-notes interview, consented testimonials | Staff | ≈ 1 h/month | Real people, real consent |
| Label WhatsApp chats, fill lead sheet | Staff | 5-15 min/week | Only they see the chats |
| Monthly AI prompt panel | You or assistant | ≈ 30 min/month | Consumer apps can't be reliably automated |
| PR pitch | You | ≈ 1 h/month | Relationships |
| Semrush re-export, ownership review | You | 1-2 h/quarter | Plan access, strategy |
| Launch review | Named reviewer(s), with you | ≈ 16-21 h once for ≈ 64 pages at 15-20 min/page (Wave 1 pillars ≈ 5-7 h first) | Launch quality |
| Legal review | Lawyer | Once, then on change | Legal |

**Time budget (ESTIMATE).** **You: ≈ 2 h/week on average** (the 75-90-min weekly ritual, fast-lane events, and monthly or quarterly tasks: AI panel 30 min/month, PR 1 h/month, Semrush 1-2 h/quarter). **Editor: ≈ 5-6 h/week** at L1. **Arabic reviewer: ≈ 1 h/week** after launch. **Religious reviewer:** setup hours, then per ritual page. **Launch:** ≈ 16-21 h of named-reviewer time.

> **Honest risk statement.** Fully automated mass publishing with a weekly human check is the **highest-risk way** to run this network under Google's scaled content abuse policy. Our default: **no prose page goes live without a full human read** (≈ 15 min/post, ESTIMATE). With your time alone that is ≈ 3-4 prose posts a week. Reaching ≈ 12-16 a week needs the part-time editor (E3): a condition of L1, not an option. A structured check (title, short answer, claims table) never schedules prose; skimmed items wait a week. The `reviewed_by` field and the on-page « relue par » line appear only when that person fully read the page. Anything else would be a false review claim, the kind of deceptive trust signal Google's 1 Oct 2026 authorship update targets [L] ([SER](https://seroundtable.com/google-warns-against-deceptive-authorship-information-42238.html)). Even fully reviewed, five same-owner domains publishing AI-assisted text still resemble the named example "creating multiple sites with the intent of hiding the scaled nature of the content". Disclosure lowers that risk but does not remove it. The facts registry, gates and kill-switches reduce the risk; they cannot remove it.

### 16.5 Kill-switches and alerts (thresholds are DESIGN CHOICES; recalibrate after 8 weeks)

| Signal | Source | Threshold | Automatic action | Resume |
|---|---|---|---|---|
| Manual action or security issue, any site | Search Console email forwarded to a monitored inbox + parser (an API endpoint for manual actions is UNVERIFIED) + weekly manual glance | Any | **Network freeze**: generation and publishing stop on all sites; red phone alert | Human only, with a written fix plan |
| Index ratio (posts aged 14-60 days, ≥ 20 eligible) | URL Inspection sample | < 0.70 | **Slow**: cap halved | After 2 green weeks, human confirms |
| | | < 0.50 | **Pause** site | Human |
| "Crawled – currently not indexed" share | URL Inspection sample | > 20% | Slow; flag the 20 most similar posts | After 2 green weeks |
| Impressions crash | Search Console (`all`) | 7-day impressions < 50% of trailing 4-week weekly average (baseline ≥ 500), no seasonal dip expected in the calendar | **Pause** site; **≥ 2 sites in the same week → network freeze** + check the [Search Status Dashboard](https://status.search.google.com/) | Human |
| Similarity drift | Gates | Mean nearest-duplicate > 0.20 over 30 posts, or ≥ 3 duplicate blocks in 7 days | Slow (likely cluster exhaustion) | Auto when back under |
| Gate failure rate | Pipeline | > 25% of drafts in 7 days (placeholder until calibrated on 20 real drafts, §10.4) | Slow + "prompt/registry issue" alert | Auto when < 20% |
| Confirmed fact error | Error form, sample, watcher | ≥ 1 | Pause that content type on that site | Human, after registry fix |
| Fact in use past `review_by` | Registry | > 7 days | Stale banner on pages; block new posts using it; > 20% of registry stale → maintenance mode | Auto on renewal |
| Official source changed | Watcher | Any | Block briefs on that topic; fast-lane alert | Human updates the fact |
| Google core/spam update rolling out | Status dashboard (feed format UNVERIFIED) | Active | No cap increases, no structural changes, no launches | Auto when done |
| Approved queue buffer | Queue | < 3 days | Alert only — **never auto-approve, never backfill** | — |
| Claude API spend | Usage logs | 80% / 100% of cap | Alert / stop generation (buffer keeps publishing) | Next month or new cap |
| Deploy / Lighthouse failure | CI | Any | That site's deploy blocked; previous version stays live; 2 in a row → alert | Auto on green |
| wikitours.ma link target | Weekly check | Not 200 | Link removed at next build; WhatsApp stays; alert | Auto when 200 again |
| Seat data age | Offers | > 7 days | Seat wording hidden | Auto on update |
| Lead anomaly | `/go/` log | Clicks −50% week on week with stable pageviews | Alert (broken number or link?) | — |
| **Dead-man switch** | Weekly sign-off | No sign-off for 10 days | All sites slow | Next sign-off |
| | | 21 days | Pause generation and publishing network-wide (data-page expiry handling continues) | Next sign-off |

Caps are **weekly** (posts per site per week), so halving never turns a small cap into a silent pause. Kill-switches are automated from Wave 2; in Wave 1 you check the same signals by hand in the weekly review.

```js
// packages/monitor/killswitch.js — tested (Node 22). Scale-down is automatic; resume is human.
const T = { idxSlow: 0.70, idxPause: 0.50, minEligible: 20, cnriSlow: 0.20, dropPause: 0.50,
            dupSlow: 0.20, dupBlocks: 3, gateFailSlow: 0.25, reviewSlowDays: 10, reviewPauseDays: 21 };
const RANK = { normal: 0, slow: 1, paused: 2 };
export function evaluateSite(m) {
  let state = 'normal'; const reasons = [];
  const bump = (s, r) => { reasons.push(r); if (RANK[s] > RANK[state]) state = s; };
  if (m.manualAction || m.securityIssue) bump('paused', 'manual action / security issue');
  if (m.eligiblePosts >= T.minEligible && m.indexRatio != null) {
    if (m.indexRatio < T.idxPause) bump('paused', `index ratio ${m.indexRatio}`);
    else if (m.indexRatio < T.idxSlow) bump('slow', `index ratio ${m.indexRatio}`);
  }
  if (m.crawledNotIndexedShare > T.cnriSlow) bump('slow', 'crawled-not-indexed share');
  if (!m.seasonalDipExpected && m.baselineWeeklyImpr >= 500 && m.impr7d < T.dropPause * m.baselineWeeklyImpr) bump('paused', 'impressions crash');
  if (m.meanNearestDup > T.dupSlow || m.dupBlocks7d >= T.dupBlocks) bump('slow', 'similarity drift');
  if (m.gateFailRate7d > T.gateFailSlow) bump('slow', 'gate failure rate');
  if (m.confirmedFactErrors > 0) bump('paused', 'confirmed fact error');
  if (m.daysSinceSignedReview > T.reviewPauseDays) bump('paused', 'weekly review missed 21+ days');
  else if (m.daysSinceSignedReview > T.reviewSlowDays) bump('slow', 'weekly review missed 10+ days');
  return { site: m.site, state, reasons };
}
// cap = posts per site per WEEK.
export function evaluateNetwork(sites, { cap }) {
  const res = sites.map(evaluateSite);
  const freeze = sites.some(s => s.manualAction || s.securityIssue) ||
                 res.filter(r => r.reasons.includes('impressions crash')).length >= 2;
  const slowCap = c => (c > 0 ? Math.max(1, Math.floor(c / 2)) : 0);
  return res.map(r => ({ ...r, networkFreeze: freeze,
    cap: freeze || r.state === 'paused' ? 0 : r.state === 'slow' ? slowCap(cap[r.site]) : cap[r.site] }));
}
export { T };
```

Tested prototypes for this strategy: `/tmp/claude-0/-home-user-blog-omra/bdf83659-de4f-5356-99c2-6f27ba7b310e/scratchpad/proto3/` (`facts-gate.js`, `killswitch.js`, `test.js`; updated 2026-10-20 with Unicode stems, the security-issue freeze and weekly caps, with regression tests; all pass). They move into `packages/` in week 2.

### 16.6 The weekly review ritual (Monday, ≈ 75-90 min; 45-min version in brackets)

| Min | Step | Done when |
|---|---|---|
| 0-5 | Read the one-page report (§16.7). Note every RED / AMBER item. | Flags noted |
| 5-8 | Search Console → Manual actions + Security for the live properties (3 at Wave 1, 5 after Wave 2) and wikitours.ma once added | All clear, or freeze confirmed |
| 8-12 | Kill-switch log: confirm or reverse each automatic action. Resuming a paused site needs a typed reason. | `state/cadence.json` committed |
| 12-25 | **Facts:** approve or reject candidates; renew facts due within 14 days; update Wiki Tours offers; check the « next 14 days » fast-lane readiness line. [45-min: due-only] | Zero expired facts in use |
| 25-60 | **Approval queue:** open `queue/<week>.yml` + preview. With the editor: every prose item already has a full read (`full_read: true`); you read the 3-5 flagged items (pillars, prices, visa/Hajj rules, anything mentioning Wiki Tours) and sign off. Owner-only mode: you fully read 3-4 posts here. Anything not fully read waits a week; a structured check never schedules prose. [45-min: flagged items only] | Merge = approval |
| 60-70 | **Random sample:** 3 posts published last week, 6-question rubric. [45-min: 2 posts] | Any "no" opens an error ticket |
| 70-75 | **Leads:** confirm staff filled the sheet; glance at clicks → chats → quotes → bookings by site | Sheet up to date |
| 75-85 | **Decisions + money-site track:** accept or reject proposed unlocks; answer « decisions needed » (defaults apply if skipped); check M1-M10 dates; **sign off** | Signed (resets the dead-man switch) |

**Sample rubric (yes / no):**
1. Is every number and date correct against its source?
2. Does the page fully answer its title question?
3. Is anything misleading or overpromising?
4. Is the disclosure present wherever Wiki Tours or Bab Makka appears?
5. Would a pilgrim's family find this useful without ever contacting us?
6. Are language and tone right for Moroccan readers (FR/AR)?

### 16.7 Auto-generated weekly report (one page)

```
OMRA NETWORK — WEEK 2026-W48 (23-29 Nov)        Generated Sun 29 Nov 18:23 UTC        Ramadan in ≈ 71 days (est.)
STATUS      OR ● green  GO ● green  AG ● amber (index ratio 0.66 → SLOW)  PX ○ not live  VO ○  CA ⇢ 301  OF ⇢ 301  RB ⇢ 301
CADENCE     level L1 (12/wk, editor) · unlock candidates: none (needs 4 green weeks)
MONEY SITE  M1 ✓ · M2 due Sun 15 Nov · M3 waiting for A2 proof
1. AUTO-ACTIONS THIS WEEK   [site · trigger · action · since]  e.g. "AG set to SLOW: index ratio 0.66"
2. HEALTH per site (posts 14-60d)   indexed % · crawled-not-indexed % · Δ vs last week
3. VISIBILITY   impressions · clicks · CTR · avg pos · main keywords in top 10 / top 3 (per site, Δ)
4. AI           GSC gen-AI impressions (entered) · Bing AI citations · chatgpt.com referrals · panel (monthly)
5. MONEY FLOW   WhatsApp clicks by site (top 5 refs) · chats · quotes · bookings (from staff sheet)
6. PRODUCTION   published / planned · approved buffer days per site · gate failures by reason (top 3) · verifier blocks
7. QUALITY      mean nearest-duplicate · last week's sample results (6-question rubric)
8. FACTS        candidates waiting (n) · expiring ≤ 14 d (list) · stale in use (n) · disputed / conflicts · watcher changes
9. KEYWORDS     biggest movers · new GSC queries without owner (top 10) · cannibalisation alerts · decay list
10. GOOGLE      core/spam update rolling? Y/N · manual actions: none / [site]
11. SPEND       Claude API month-to-date vs cap · cost per published post · files per site vs 20k cap
NEXT 14 DAYS + FAST-LANE READINESS   e.g. 6-13 Dec school break · ≈10 Dec Rajab (est.) · Hajj 1449H registration watch ✓
APPROVAL DIGEST   23 items → 4 flagged for full read (links) · 19 routine (claims tables inline)
DECISIONS NEEDED (max 5, each with its default if unanswered)
```

---

## 17. Domain portfolio & expansion

### 17.1 Verdict

- **Do not build more content sites now.** The constraints are verified facts, original data and review time — not domain count. "If you make 2 websites out of one, you're not going to be twice as visible in search" (Mueller) [L]. Mueller (2024) said owning several sites is not a problem by itself, but working on many sites leaves less time to make each one truly good; his answer assumed sites on different topics, so same-topic sites may raise other concerns [L] ([SEJ](https://www.searchenginejournal.com/google-answers-whether-having-two-sites-affects-rankings/514335/)). Cutts: a few own sites linked is fine; at 50+ it looks like a network [L].
- **Do buy cheap brand-defence domains and redirect them.** Fraud and impersonation are real risks in this market.
- **Availability of every name below is UNKNOWN** until you check with a .ma registrar. .ma registration terms are NOT RESEARCHED.

### 17.2 Candidates (priority order)

| Priority | Candidate (examples; availability UNKNOWN) | Job | Verdict |
|---|---|---|---|
| 1 | babmakka.ma, bab-makka.ma | Brand defence for Bab Makka | **Buy if available; 301 to the Bab Makka page** after a clean history check (DNS-level; wikitours.ma is not touched) |
| 1 | wiki-tours.ma, wikitour.ma (typos) | Brand and impersonation defence | **Buy if cheap; 301 to wikitours.ma** after a clean history check |
| Later | **A Hajj domain** (e.g. hajjmaroc.ma, guidehajj.ma, hajj-maroc.ma) | Moroccan Hajj process hub. None of the 8 domains contains "hajj", and Hajj has its own peaks. | **Not now.** A Hajj keyword domain is the same pattern as the keyword variants we advise against (§17.5). Revisit at the Jun 2027 audit under §17.3; it would also have to respect D1 (wikitours.ma owns agency registration). Hajj content stays on guideomra.ma/hajj/. |
| 3 | An Arabic-script .ma name (Arabic IDN; whether one exists for Morocco and its rules are UNVERIFIED) | Defensive redirect to `/ar/` | **Don't build a separate Arabic site.** Arabic belongs under `/ar/` with hreflang. Defensive at most. |
| 3 | Bab Makka social handles / .com | Brand defence outside .ma | Check and secure if available (UNKNOWN) |
| Later | Diaspora site (non-.ma) for Moroccans in Europe | MRE pilgrims | Not now. Demand UNKNOWN; .ma is a strong Morocco signal ([Google](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)). Revisit with Search Console country data, and only if Wiki Tours serves European departures. |

**Every 301 to wikitours.ma is conditional on a clean Wayback / whois / backlink check (D6).** A domain with an unrelated history is dropped, or redirected to a satellite, never to wikitours.ma.

### 17.3 Entry criteria a new content site must meet before launch (all required)

1. A written charter that passes the "would it exist without search engines?" test, with a job no existing site or wikitours.ma serves — proven by a cluster set with **zero** `match_key` overlap.
2. ≥ 10 distinct main keywords (Semrush) that fit the job and are not already assigned or reserved.
3. Its own data asset (dataset, tracker or real local presence) with a named human owner and refresh frequency.
4. ≥ 3 months of content supply in **verified** facts, and ≥ 30 distinct clusters with real demand (design choice).
5. Every active site green for 8 consecutive weeks; no site paused in that period; average index ratio ≥ 80%.
6. Review capacity: your time stays at ≈ 2 h/week after adding it, or reviewer hours are added.
7. Distinct design; legal check where needed; ownership disclosed.
8. Clean domain history (Wayback/whois), no expired-domain reuse ([Google](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)).
9. **Net-zero rule:** it fits under the portfolio ceiling, so another site is merged or frozen first (first candidates: the held sites).

### 17.4 Portfolio ceiling for a one-operator system

- **4-6 sites actively publishing** with you alone (L1).
- **Up to 8 active** with a part-time editor.
- **Never more than 8 active content sites.** Held or defensive domains redirect and carry no content, so they do not count.
- **Plan for 2026-27:** 5 active, 3 held (redirecting), plus 2-4 defensive redirects. Revisit at the Jun 2027 audit on real data. Consolidation is a success outcome, not a failure.

### 17.5 What NOT to buy

| Don't buy | Why |
|---|---|
| More city domains (omramarrakech.ma, omrafes.ma, omratanger.ma, omraagadir.ma, omraoujda.ma…) | Google's first doorway example; no real offices there; Mueller on city pages [L] |
| Year domains (omra2027.ma, ramadan2027.ma) | They age out in months; evergreen URLs on omra-ramadan.ma do the job |
| Keyword variants (omrapascher.ma, meilleureagenceomra.ma, omra-vip.ma, umrah-maroc.ma) | "Multiple websites with slight variations to the URL"; omra-vip also collides with wikitours.ma's tiers post |
| Expired domains with backlinks | Expired domain abuse ([Google](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)) |
| Competitor brands or typos | Legal and dispute risk |
| A Madinah / ziyara domain | wikitours.ma owns ziyara |

---

## Sources

Official and primary
- Google spam policies — https://developers.google.com/search/docs/essentials/spam-policies
- Google doorway update (2015) — https://developers.google.com/search/blog/2015/03/an-update-on-doorway-pages
- Google March 2024 core update and spam policies — https://developers.google.com/search/blog/2024/03/core-update-spam-policies
- Google AI-content FAQ (2023) — https://developers.google.com/search/blog/2023/02/google-search-and-ai-content
- Google helpful content — https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google AI features — https://developers.google.com/search/docs/appearance/ai-features
- Google AI optimization guide — https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google gen-AI performance reports (June 2026) — https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- Google robots meta tag — https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Google, simplifying breadcrumbs on mobile (Jan 2025) — https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs
- Google common crawlers (Google-Extended) — https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google structured data gallery — https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Google Article markup — https://developers.google.com/search/docs/appearance/structured-data/article
- Google Event markup — https://developers.google.com/search/docs/appearance/structured-data/event
- Google review snippet — https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Google Indexing API — https://developers.google.com/search/apis/indexing-api/v3/using-api
- Google recrawl — https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Google sitemaps — https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google localized versions (hreflang) — https://developers.google.com/search/docs/specialty/international/localized-versions
- Google multi-regional sites (ccTLD) — https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Google back-button hijacking policy — https://developers.google.com/search/blog/2026/04/back-button-hijacking
- Search Console API — https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Status Dashboard — https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history
- Google AI Overviews expansion (May 2025) — https://blog.google/products/search/ai-overview-expansion-may-2025-update/
- Google AI Mode help — https://support.google.com/websearch/answer/16011537?hl=en
- Google Terms of Service — https://policies.google.com/terms
- Merchant Center Misrepresentation — https://support.google.com/merchants/answer/6150127?hl=en
- Merchant Center website claim — https://support.google.com/merchants/answer/14089347?hl=en
- Google Business Profile guidelines — https://support.google.com/business/answer/3038177?hl=en
- Bing website boundaries (2019) — https://blogs.bing.com/webmaster/2019/11/Some-Thoughts-on-Website-Boundaries/
- Bing import from Search Console — https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools
- Bing AI Performance report — https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
- Microsoft guidance on AI answers — https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers
- IndexNow documentation — https://www.indexnow.org/documentation
- OpenAI crawlers — https://developers.openai.com/api/docs/bots
- OpenAI publishers FAQ — https://help-lb.openai.com/en/articles/12627856-publishers-and-developers-faq
- Perplexity crawlers — https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md
- Anthropic crawlers — https://support.claude.com/en/articles/8896518-does-anthropic-crawl-the-web-and-how-can-site-owners-block-the-crawler
- Apple (Applebot-Extended) — https://support.apple.com/en-us/HT6619
- Cloudflare Pages limits — https://developers.cloudflare.com/pages/platform/limits/
- GitHub Actions schedule — https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule
- GitHub, disabling and enabling a workflow (60-day rule; Enterprise Server copy) — https://docs.github.com/en/enterprise-server@3.7/actions/using-workflows/disabling-and-enabling-a-workflow
- web.dev Core Web Vitals — https://web.dev/articles/vitals
- W3C text direction — https://www.w3.org/International/questions/qa-html-dir
- WhatsApp click to chat FAQ (not re-checked) — https://whatsapp.com/faq/en/general/26000030
- Dotdigital, WhatsApp click-to-chat format (third party) — https://support.dotdigital.com/en/articles/11331301-click-to-chat-for-whatsapp
- Saudi Ministry of Hajj and Umrah, 1448H season calendar — https://haj.gov.sa/en/Media-Center/Ministry-News/2026/Ministry-of-Hajj-and-Umrah-Announces-the-Umrah-Season-Calendar-for-1448-AH
- Saudi Ministry, Nusuk Umrah — https://haj.gov.sa/en/Media-Center/Ministry-News/Ministry-of-Hajj-and-Umrah-launches-Nusuk-Umrah-service-to-enable-pilgrims-from-outside-the-Kingdom
- flynas Jeddah-Rabat launch — https://www.flynas.com/en/media-center/news-updates/flynas-announces-the-launch-of-direct-flights-between-jeddah-and-the-moroccan-capital-rabat-starting-from-july-4th-becomimg-the-first-saudi-carrier-to-operate-direct-flights-between-the-two-cities
- Royal Air Maroc, flights to Saudi Arabia — https://www.royalairmaroc.com/en/flights-to-saudi-arabia
- Manku et al. 2007 (SimHash) — https://dl.acm.org/doi/10.1145/1242572.1242592

Moroccan and regional press / data
- Hespress FR, consumer observatory warning (Feb 2026) — https://fr.hespress.com/462180-omra-lobservatoire-du-consommateur-appelle-a-un-controle-renforce-des-agences.html
- Hespress FR, Hajj 1448H registration — https://fr.hespress.com/451603-linscription-electronique-des-candidats-au-hajj-1448-h-du-8-au-19-decembre-2025.html
- Hespress FR, ministry measures for pilgrims — https://fr.hespress.com/441379-hajj-et-omra-mesures-renforcees-pour-proteger-les-pelerins-marocains.html
- Hespress EN, scam warnings — https://en.hespress.com/131697-moroccan-authorities-consumer-groups-warn-against-travel-scams-amid-luxury-umrah-audit.html
- Hespress EN, language survey — https://en.hespress.com/112190-112190.html
- H24info, KSAR TOURS case — https://h24info.ma/?p=985412
- Le360, Hajj 1447H final cost — https://fr.le360.ma/societe/hajj-1447h-les-frais-definitifs-fixes-a-63021-dirhams_HFBAQQU5INGOPKRWSNL7NY2QN4/
- Le360, 2026-27 school calendar — https://en.le360.ma/society/2026-27-school-year-key-dates-for-students-and-teachers_ORTNN5RKQ5DYJGJHTE5ULMCDYM/
- EcoActu, Hajj cost and provisional 65,000 MAD — https://ecoactu.ma/hajj-1447h-le-cout-fixe-a-63-021-dh-remboursement-prevu-des-le-9-mars-2026/
- Medias24, Hajj registration/lottery timing — https://medias24.com/2025/06/16/hajj-2026-le-tirage-au-sort-aura-lieu-du-23-juin-au-04-juillet-2025/
- Medias24, Ramadan Omra 2023/2024 — https://medias24.com/2024/04/03/omra-2024-inflation-situation-geopolitique-et-secteur-informel-ont-fait-chuter-le-nombre-de-pelerins/
- Medias24, Omra trend among young people — https://medias24.com/2025/02/13/tourisme-religieux-la-omra-devient-une-tendance-qui-prend-de-lampleur-chez-les-jeunes/
- Medias24, RAM Gulf suspension — https://medias24.com/2026/03/27/royal-air-maroc-prolonge-la-suspension-de-ses-vols-vers-dubai-et-doha-jusquau-15-avril-1649760/
- Morocco World News, Hajj quota — https://www.moroccoworldnews.com/2026/04/288023/morocco-sets-34000-pilgrims-quota-lower-costs-digital-upgrade-for-hajj-season/
- TelQuel, Ramadan 2026 start in Morocco — https://telquel.ma/instant-t/2026/02/18/jeudi-19-fevrier-1er-jour-du-mois-de-ramadan-au-maroc_1975833/
- TelQuel, Hajj 2026 ONDA / Makkah Route — https://telquel.ma/instant-t/2026/05/22/hajj-2026-londa-deploie-un-dispositif-special_1991022/
- TelQuel, Hajj 1447 return flights (9 Jun 2026) — https://telquel.ma/instant-t/2026/06/09/hajj-1447-plus-de-11-000-pelerins-marocains-deja-rentres-78-vols-prevus-au-retour_1993201/
- EcoActu, Law 11-16 — https://ecoactu.ma/?p=17467
- DataReportal, Digital 2026 Morocco — https://datareportal.com/reports/digital-2026-morocco
- Affect Group, Morocco social audiences (agency blog, UNVERIFIED) — https://affectgroup.com/blog/morocco-tiktok-audience-by-age-and-gender/
- SNRTnews, RAM Omra/Hajj flight program — https://snrtnews.com/fr/article/omra-et-haj-la-ram-deploie-un-nouveau-programme-de-vols-69745
- SNRTnews, commercialisation of Omra — https://snrtnews.com/fr/article/omra-20-quand-une-pratique-religieuse-se-commercialise-116219
- wafir.ma, summer 2026 Omra comparison (commercial, UNVERIFIED) — https://wafir.ma/fr/guide/omra-ete-2026-maroc-12-agences-comparatif-prix-financement
- Gulf News, Umrah visa 30-day rule — https://gulfnews.com/world/gulf/saudi/saudi-arabia-announces-new-amendments-to-umrah-visa-rules-1.500328262
- Gulf News, ACWY requirement — https://gulfnews.com/living-in-uae/health/umrah-2025-meningitis-vaccine-now-mandatory-for-all-pilgrims-1.500025860
- Gulf News, 1,800 agencies suspended — https://gulfnews.com/world/gulf/saudi/saudi-arabia-suspends-1800-foreign-umrah-agencies-after-review-1.500430224
- Wego, Ramadan 2027 — https://blog.wego.com/ramadan-2027/
- Khaleej Times, 2027 Eid dates — https://www.khaleejtimes.com/uae/ramadan-eid-al-fitr-eid-al-adha-2027-likely-dates
- moonsighting.org.uk, Sha'ban 1448 — https://moonsighting.org.uk/moon/sighting-reports/report-1448-08.html
- truecalendar, Hijri 1449 — https://truecalendar.com/hijri/1449
- islamic.app, Mawlid 2027 — https://islamic.app/hijri/mawlid/2027

SEO industry (secondary)
- PPC Land, Google AI fact-check guidance (1 Oct 2026) — https://ppc.land/google-tells-sites-to-manually-factcheck-all-ai-content-before-publishing/
- PPC Land, gen-AI opt-out setting — https://ppc.land/google-gives-site-owners-a-toggle-to-exit-ai-overviews-and-ai-mode/
- PPC Land, llms.txt log study — https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/
- Search Engine Roundtable, deceptive authorship — https://seroundtable.com/google-warns-against-deceptive-authorship-information-42238.html
- Search Engine Roundtable, sister brand sites (Mueller, Jan 2026) — https://www.seroundtable.com/google-linking-brand-websites-40761.html
- Search Engine Roundtable, two sites not twice as visible — https://seroundtable.com/google-two-for-one-27618.html
- Search Engine Roundtable, city landing pages — https://www.seroundtable.com/google-city-landing-pages-doorway-pages-28670.html
- Search Engine Journal, changing dates won't improve rankings (Mueller) — https://www.searchenginejournal.com/googles-john-mueller-changing-dates-on-pages-wont-improve-rankings/401734/
- Search Engine Journal, how freshness works (posting frequency, Mueller) — https://www.searchenginejournal.com/how-freshness-works/457485/
- Search Engine Journal, multiple sites, similar content — https://www.searchenginejournal.com/google-multiple-sites-ip-not-problem-similar-content/254799/
- Search Engine Journal, owning two sites — https://www.searchenginejournal.com/google-answers-whether-having-two-sites-affects-rankings/514335/
- Search Engine Journal, crawled-not-indexed — https://www.searchenginejournal.com/google-explains-crawled-not-indexed/521311/
- Search Engine Journal, FAQ rich results dropped — https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/
- Search Engine Journal, Bing GEO guidelines — https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442
- Search Engine Land, September 2026 spam update — https://searchengineland.com/google-september-2026-spam-update-done-rolling-out-493550
- Search Engine Land, recovery uncertain (Sullivan) — https://searchengineland.com/google-danny-sullivan-algorithm-update-recovery-uncertain-446317
- Search Engine Land, good SEO is good GEO — https://searchengineland.com/google-danny-sullivan-good-seo-good-geo-461464
- Search Engine Land, Cutts on linking own sites — https://searchengineland.com/?p=157141
- GSQi, August 2026 spam update case studies — https://gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/
- Ahrefs, link spam glossary — https://ahrefs.com/seo/glossary/link-spam
- DesignRush (Ahrefs AI Overview study) — https://news.designrush.com/ai-overview-citations-drop-ahrefs
- Windows Latest, ChatGPT search and Bing — https://www.windowslatest.com/2024/11/01/chatgpt-search-engine-uses-bing-builds-extension-to-replace-google-in-chrome/amp/
- MIT Technology Review, Cloudflare AI-bot blocking — https://www.technologyreview.com/2025/07/01/1119498/cloudflare-will-now-by-default-block-ai-bots-from-crawling-its-clients-websites/

*Next update: after Semrush exports (week 2), P0 inputs, and the first 4-week health review (mid-Dec 2026).*



