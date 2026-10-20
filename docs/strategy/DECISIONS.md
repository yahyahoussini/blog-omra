# Client decisions and overrides (2026-10-20)

This log records what the client decided after reading `STRATEGY.md`. Where a decision differs from the strategy, **this file wins for the build**. The strategy's risk notes still apply, and the engine keeps every safety rail that does not conflict with these decisions.

## D-A. wikitours.ma is off-limits
- We never edit wikitours.ma and we get no access to it. Recommendations for it go to the client only (§4.6 of the strategy).
- Leads are captured on the satellites: a WhatsApp click-to-chat button to the Wiki Tours number, with a pre-filled message that starts with a reference code (`[OR-0001]`, etc.).

## D-B. All 8 sites are built and go live (override of §5.6–5.8 "hold")
Each held site gets a distinct, standalone job so it passes the test « would this site exist if search engines didn't? ». None of them targets the topics reserved for wikitours.ma (§4.2).

| Site | Ref | Job (standalone value) | Hard rules |
|---|---|---|---|
| omra-ramadan.ma | OR | Ramadan planning and deadlines | as §5.1 |
| guideomra.ma | GO | Sourced Omra & Hajj reference | as §5.2 |
| agenceomra.ma | AG | Verify and choose a licensed agency, no rankings | as §5.3; no named agency without `legal_ok` |
| prixomra.ma | PX | Price observatory: official Hajj cost history, published averages, method; survey tables once the survey exists | as §5.4; no comparison of named agencies without `legal_ok` |
| voyageomra.ma | VO | Trip logistics: flights, luggage, heat, health on the road | as §5.5, but **CMN and RBA detail move to the two city sites**; voyageomra keeps a short national airports overview that links to them |
| omracasablanca.ma | CA | « Partir de Casablanca »: CMN departure guide and Casablanca-Settat practical logistics for pilgrims | Never targets « agence omra casablanca » (reserved). No office page, no LocalBusiness markup, no Google Business Profile. Every page needs a verified Casablanca-specific fact. |
| omrarabat.ma | RB | « Partir de Rabat-Salé-Kénitra »: RBA departures (flynas Rabat–Jeddah), regional logistics | States honestly that Wiki Tours is based in Casablanca. Never implies a Rabat office. |
| offresomra.ma | OF | « Lire et comparer une offre Omra »: offer anatomy, red flags, a client-side comparison tool (nothing stored), offer calendar | Wiki Tours / Bab Makka offers appear only as « Offre de l'éditeur » from dated records. A multi-agency offers board only after `legal_ok`. |

## D-C. Publishing cadence: 3 posts/day/site, fully automated (override of §7.2)
- **Ceiling:** 3 posts per day per site (24/day network-wide), as the client decided.
- **Ramp (partner recommendation, one config line to change):** days 1–14 after launch, 1/day/site; days 15–28, 2/day; from day 29, 3/day, but only while the kill-switches are green.
- **Supply brake (kept):** a post is generated only for a unique topic that passes the cannibalisation and duplicate gates. When a site runs out of unique topics, it idles instead of padding.
- **Publish mode:** `auto`. A daily post that passes every automated gate is published without a human read. The client checks once a week, from the auto-generated report (a GitHub issue). Closing that issue = review done.
- **Kept safety rails:** facts registry (no number or rule outside it), all automated gates (§7.4), kill-switches (§16.5), dead-man switch (no closed weekly review issue in 10 days → cadence halves; 21 days → pause), spend cap.
- **Honest risk (from the strategy, unchanged):** Google said on 1 Oct 2026 that all AI content should be fact-checked by a human before publishing [L]. Auto mode is the highest-risk setup under the scaled-content policy. Switching to `review` mode is one line in `config/cadence.json`.

## D-D. Links: the sites serve each other (partial override of §3.5 / §8.2)
- **Sister links (satellite ↔ satellite):** up to **2 per post**, contextual, in the body, **followed**, only along the flow map in `config/network.json`. No sitewide footer or template blocks. No reciprocal page pairs. At most 5 links per sister pair per week.
- **Links to wikitours.ma:** at most 1 per post, contextual, `nofollow` by default (kept from §3.5), brand or descriptive anchors only, 0% exact-match commercial anchors.
- **Outbound authority links:** followed (they are citations).

## D-E. Facts registry for v1
- Seeded from the strategy research (`research-facts.json`, 2026-10-20). Facts that sources confirmed are `approved` with `verified_by: "desk-research-2026-10-20"`. **A real person must re-confirm them**; until then, pages say « Sources consultées le … » and never « vérifié par [nom] ».
- `fact_wikitours_licence` and `fact_wikitours_since_2016` stay `proposed` (not usable) until the official ministry-list proof arrives.

## D-F. Authorship
- No real authors are known yet. Every page carries the organisation byline « Wiki Tours International » and an honest AI-assistance line. No invented people, ever.

## D-G. Semrush
- The Semrush connector is connected but the account had **no API units** on 2026-10-20. Keyword lists are PLACEHOLDERS from the research. When API units exist (or CSV exports arrive in `data/semrush/raw/`), the registry is rebuilt from real data.

## D-H. Language
- French first (root). Arabic under `/ar/` in phase 2 (the engine supports it; RTL ready).
