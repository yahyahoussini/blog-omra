# Semrush export brief — Omra network

**Date:** 2026-10-20 · **For:** the client · **Deadline:** R0 + R2 by **Fri 30 Oct 2026**, the rest by Sun 8 Nov 2026.

**Why this matters:** our engine builds the whole keyword registry from these files. It reads them automatically, so the **database, file names and format must follow this brief exactly**. All seed keywords below are **PLACEHOLDERS** — change them freely; we have no search volumes yet.

---

## Golden rules (read before you export)

1. **Database = Morocco.** In every report, open the database dropdown and choose **Morocco** (expected code `ma` — UNVERIFIED). If Morocco is not in the list, **stop and tell us** before exporting anything. Never mix databases.
2. **Format = CSV** (comma; "CSV semicolon" is also OK). **No XLSX.**
3. **Export all rows and all columns** your plan allows. **No volume filter** — Moroccan volumes are small and "n/a" rows are useful.
4. **Never open and re-save the file in Excel.** It breaks Arabic text (UTF-8). Upload the original download.
5. **Rename every file** with the pattern below (lowercase, no spaces, no accents, no Arabic letters in the file name).
6. **First send one sample of each report type.** We check the column headers (Semrush headers change over time; ours are UNVERIFIED) before you do the full set.

### File name pattern

```
<report>_<site-or-domain>_<slug>_<db>_<YYYYMMDD>.csv
```

| Part | Allowed values | Example |
|---|---|---|
| `report` | `main-keywords`, `kmt`, `kmt-questions`, `or-positions`, `or-competitors`, `or-pages`, `kgap-missing`, `kgap-untapped`, `kgap-all`, `pt` | `kmt` |
| `site-or-domain` | the satellite the seed is for (e.g. `guideomra.ma`), the analysed domain (e.g. `wikitours.ma`), or `network` for generic seeds | `guideomra.ma` |
| `slug` | the seed or set name in ASCII, words joined by `-`. Transliterate Arabic seeds (e.g. `omra-ramadan-ar`). Use `all` or `list` when there is no seed. | `documents-omra` |
| `db` | `ma` | `ma` |
| `YYYYMMDD` | export date | `20261030` |

Examples:
- `main-keywords_guideomra.ma_list_ma_20261030.csv`
- `kmt_omra-ramadan.ma_omra-ramadan-2027_ma_20261030.csv`
- `kmt-questions_network_omra-ar_ma_20261030.csv`
- `or-positions_wikitours.ma_all_ma_20261030.csv`
- `kgap-missing_wikitours.ma_set1_ma_20261102.csv`
- `pt_guideomra.ma_morocco-mobile_ma_20261109.csv`

---

## Step 0 — Check your plan (5 min)

Tell us: plan name (Pro / Guru / Business), number of projects allowed, export row limit, and whether you have API units. Plan limits are UNVERIFIED on our side; Position Tracking needs one project per active domain (6-9).

---

## Step 1 — R0: your 10 main keywords per site (manual file)

Create one CSV per **active** site (6 files now; add offresomra.ma and omrarabat.ma only if they are relaunched).

Columns (exactly):

```
Keyword,Rank,Site,Language,Notes
étapes de la omra,1,guideomra.ma,fr,
مناسك العمرة,2,guideomra.ma,ar,
```

- `Rank` = 1 to 10 (your priority). `Language` = `fr` or `ar` (Latin-script Darija → `fr`, and write "darija" in Notes).
- Rules we will check: no keyword twice across sites; no keyword on a topic reserved for wikitours.ma (brand, Bab Makka, "gammes omra", "inscription hajj agence / quota", "que visiter médine", "agence omra casablanca"). If one breaks a rule, we will propose a replacement — you decide.
- Save with a UTF-8 editor (Google Sheets → Download → CSV works; Excel "Save as" does not).

File name: `main-keywords_<site>_list_ma_<date>.csv`

---

## Step 2 — R2: Organic Research for wikitours.ma (MANDATORY)

This tells us which topics wikitours.ma already ranks for, so the satellites never compete with it.

1. **Organic Research** → enter `wikitours.ma` → database **Morocco**.
2. **Positions** tab → no filters (positions 1-100) → **Export → All → CSV**.
   → `or-positions_wikitours.ma_all_ma_<date>.csv`
3. **Pages** tab → Export all.
   → `or-pages_wikitours.ma_all_ma_<date>.csv`
4. **Competitors** tab → Export all.
   → `or-competitors_wikitours.ma_all_ma_<date>.csv`

If wikitours.ma shows almost no data in the Morocco database, still export it and tell us.

---

## Step 3 — R2: Organic Research for competitors

### 3a. Agencies (we do not guess names)

From the **Competitors** export in Step 2, take the **top 5 Moroccan travel agencies** (ignore media, airlines and big foreign sites). Write their domains in a note to us, then export **Positions** for each (Morocco, all rows):
→ `or-positions_<agency-domain>_all_ma_<date>.csv`

### 3b. Comparison and information sites

Export **Positions** (Morocco, all rows) for:

| Domain | Type | Note |
|---|---|---|
| `wafir.ma` | Moroccan comparison site | Full export |
| `hajjumrahplanner.com` | Foreign info site (FR) | Full export |
| `blog.wego.com/fr/` | Foreign OTA blog | Enter as a subfolder if your plan allows; otherwise skip |

### 3c. Media (filtered)

For each media domain, in Positions add an **include filter on Keyword**, one at a time or with "contains": `omra`, `umrah`, `oumra`, `hajj`, `عمرة`, `العمرة`, `حج`. Export the filtered rows.

`fr.hespress.com`, `hespress.com`, `le360.ma`, `medias24.com`, `snrtnews.com`, `yabiladi.com`, `aujourdhui.ma`

→ `or-positions_<domain>_omra-hajj_ma_<date>.csv`

---

## Step 4 — R1 / R1q: Keyword Magic Tool

Database **Morocco**, match type **Broad**, **no filters**. For each seed: export **All keywords** (R1) and the **Questions** tab (R1q).

### Network seeds (site = `network`)

`omra` · `umrah` · `oumra` · `hajj` · `عمرة` · `العمرة` · `حج`

→ e.g. `kmt_network_omra_ma_<date>.csv`, `kmt-questions_network_omra-ar_ma_<date>.csv`

### Seeds per site (PLACEHOLDERS — also add each of your 10 main keywords as a seed)

| Site | Placeholder seeds |
|---|---|
| omra-ramadan.ma | `omra ramadan` · `omra ramadan 2027` · `date ramadan 2027` · `visa omra ramadan` · `عمرة رمضان` |
| guideomra.ma | `étapes omra` · `documents omra` · `vaccin omra` · `nusuk` · `rawdah` · `مناسك العمرة` · `hajj maroc` |
| agenceomra.ma | `agence omra` · `agence de voyage agréée` · `arnaque omra` · `contrat omra` · `وكالة عمرة` |
| prixomra.ma | `prix omra` · `prix omra 2027` · `prix omra ramadan` · `ثمن العمرة` · `prix hajj` |
| voyageomra.ma | `vol omra` · `vol jeddah` · `vol rabat jeddah` · `valise omra` · `ihram` · `لوازم العمرة` |
| omracasablanca.ma | `omra casablanca` · `aéroport mohammed v` · `départ casablanca omra` |
| (held) offresomra.ma | `offre omra` · `promo omra` · `عروض العمرة` — export only, no site build yet |
| (held) omrarabat.ma | `omra rabat` · `aéroport rabat salé` — export only, no site build yet |

File names: `kmt_<site>_<seed-slug>_ma_<date>.csv` and `kmt-questions_<site>_<seed-slug>_ma_<date>.csv`
(e.g. `kmt_prixomra.ma_prix-omra-ramadan_ma_20261103.csv`; Arabic seed `ثمن العمرة` → slug `taman-omra-ar`).

---

## Step 5 — R3: Keyword Gap

Database **Morocco**, **Organic** keywords.

- **Set 1:** `wikitours.ma` (first) vs the top 4 agencies from Step 3a.
- **Set 2:** `wikitours.ma` vs `wafir.ma`.

For each set, export the **Missing**, **Untapped** and **All** tabs (3 files per set):
→ `kgap-missing_wikitours.ma_set1_ma_<date>.csv`, `kgap-untapped_wikitours.ma_set1_ma_<date>.csv`, `kgap-all_wikitours.ma_set1_ma_<date>.csv`

Also send a tiny text note with the domain order of each set, e.g.:
```
set1: wikitours.ma, agency1.ma, agency2.ma, agency3.ma, agency4.ma
set2: wikitours.ma, wafir.ma
```
Save it as `kgap_sets.txt` in the same folder.

---

## Step 6 — R4: Position Tracking (set up once, export weekly)

1. One project per **active** domain (6 now) + `wikitours.ma` if your plan allows. Check your project limit first.
2. Location: **Morocco** (add Casablanca / Rabat city targeting only if Semrush offers it — UNVERIFIED). Device: **mobile** first; desktop if quota allows.
3. Keywords: the site's 10 main keywords (R0). We will send you cluster pillar keywords to add later.
4. Tags: `site:<domain>`, `lang:fr` or `lang:ar`.
5. **Every Monday:** export **Rankings Overview** as CSV.
   → `pt_<domain>_morocco-mobile_ma_<date>.csv`

---

## Step 7 — Optional but valuable: manual SERP check from Morocco (20 min)

Our research tool could only see US results. A quick look at real Moroccan results helps a lot.

From a computer **in Morocco**, in a **private/incognito window**, open:
`https://www.google.com/search?q=<query>&gl=ma&hl=fr` (use `hl=ar` for the Arabic queries)

Queries: `prix omra 2027` · `omra ramadan 2027` · `agence omra casablanca` · `agence omra rabat` · `offre omra` · `guide omra étapes` · `visa omra maroc` · `meilleure agence omra maroc` · `omra sans agence nusuk` · `عمرة رمضان 2027 المغرب` · `ثمن العمرة المغرب` · `hajj 2027 maroc prix`

For each, fill one row per result (top 10) in a Google Sheet and download as CSV:

```
query,position,domain,url,type,shows_price,year_in_title,local_pack_shown,ai_overview_shown
prix omra 2027,1,example.ma,https://example.ma/...,agency,yes,2026,no,yes
```

`type` = agency / comparison / media / foreign / gov / video. Save as `serp-manual_network_top10_ma_<date>.csv`.

---

## Step 8 — Hand-over

1. Put all files in the repo folder:
   ```
   /home/user/blog-omra/data/semrush/raw/<YYYYMMDD>/
   ```
   (one folder per export day, e.g. `data/semrush/raw/20261030/`). In GitHub: open the repo → `data/semrush/raw/` → **Add file → Upload files** → type the folder name `20261030/` before the file names → commit to a new branch. If that is difficult, send a single **.zip** and we place the files.
2. **Do not edit, rename columns, sort or filter the files after export** (except the media filters in Step 3c, which are done inside Semrush).
3. Send us a short message: which files are in, plan limits (Step 0), and anything that looked odd (e.g. Morocco database missing, very few results).

What happens next: the ingester checks every file name, maps the column headers, rejects any file without a `Keyword` column, keeps "n/a" as empty (never guessed), and reports unknown columns to us. Your decisions (which site owns which keyword) are stored separately, so a new export never overwrites them.

---

## Checklist

- [ ] Step 0: plan limits sent
- [ ] Morocco database confirmed (or reported missing)
- [ ] R0: 6 × `main-keywords_…csv`
- [ ] R2: wikitours.ma positions + pages + competitors
- [ ] R2: top 5 agencies + wafir.ma + hajjumrahplanner.com (+ wego/fr if possible)
- [ ] R2: 7 media domains, filtered on omra/hajj terms
- [ ] R1/R1q: network seeds + site seeds (+ your main keywords as seeds)
- [ ] R3: Keyword Gap set 1 + set 2 (3 tabs each) + `kgap_sets.txt`
- [ ] R4: Position Tracking projects created; first Monday export
- [ ] Optional: manual SERP CSV from Morocco
- [ ] Files uploaded to `data/semrush/raw/<YYYYMMDD>/`, not re-saved in Excel

**Refresh schedule:** R0-R3 again around **30 Nov 2026** (≈ 10 weeks before Ramadan), then every quarter. R4 every Monday.
