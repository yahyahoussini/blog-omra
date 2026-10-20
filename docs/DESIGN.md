# BrandHUB Omra — design system for the 8 sites

Source: the client's **BrandHUB Product Design System** (claude.ai artifact « BrandHUB Product Design System »). This file adapts it to the Omra network with small edits. **Everything not changed here follows BrandHUB.**

## 1. What stays from BrandHUB (the DNA)

| Element | Rule |
|---|---|
| Voice | Direct. Confident. Honest. A button says exactly what happens. |
| Type | **DM Serif Display** (titles, key numbers, dates, prices) · **DM Sans** (all body/UI) · **DM Mono** (reference codes, sources, timestamps). Arabic: **IBM Plex Sans Arabic** (body) · **Noto Kufi Arabic** 700 (display). Never set Arabic in DM fonts. |
| Labels | 11 px, DM Sans 600, uppercase, letter-spacing .2em (Latin only; Arabic labels = weight 700, no tracking). |
| Shape | Radius **2 px** on cards, inputs, pills, buttons; 0 on tables and panels. |
| Depth | **No shadows.** Card groups sit on a 2 px seam: grid with `gap:2px` on a `--line` background. |
| Emphasis | 3–4 px accent border on the **start** side (logical property, flips in RTL). |
| Spacing | 4 px grid. Component padding 16/24. Section gaps 32/48. Gutters 16 (phone) / 24 (tablet) / 40 (desktop). Reading column ≈ 720–860 px. |
| Cover band | Black (`#0A0A0A`) hero band with white serif title, grey lead, and a 4 px accent bottom border. |
| Section titles | DM Serif Display with a 2 px ink underline. |
| States | Semantic colours only for meaning: ok `#1F8A4C`, warn `#B86E00`, danger `#C8102E` (+ soft fills). Text label always next to the colour. |
| Don't | Gradients, glassmorphism, rounded-xl cards, emoji as icons, colour-only status, centred body text, blue-purple gradients. |

## 2. The small edits for Omra

1. **One accent per site instead of the single BrandHUB blue.** Same rule: one accent action or selected item per screen.
2. **Moroccan geometry, quietly.** Each site gets one zellige-style SVG pattern (8-point star, girih, moucharabieh lattice, arch) used **only** in the black cover band (≤ 8% opacity, white or accent) and as a thin divider. Never behind body text.
3. **Arch motif** for media frames and the home hero mark (CSS `border-start-start-radius`/`border-start-end-radius: 999px` on a 2 px-bordered frame). It is the only rounded shape besides the logo mark.
4. **Warm neutrals option.** Sites may swap pure white for a warm paper (`#FBF8F2`) and grey `#F4F4F4` for sand (`#F3EEE4`) — guideomra and voyageomra do; the rest keep BrandHUB greys.
5. **Body size 18 px** (BrandHUB 15 px was for apps; these are long-read pages for older readers). Arabic body 19 px, line-height 1.9.
6. **WhatsApp CTA** = the primary button (accent fill, white text, 56 px tall on mobile), label states who the reader contacts (« Parler à Wiki Tours (éditeur de ce site) »).

## 3. Per-site accents (contrast checked, WCAG AA)

| Site | Accent (light) | Accent on dark | Contrast | Pattern | Surface | Default theme |
|---|---|---|---|---|---|---|
| agenceomra.ma | `#1A1BBF` (BrandHUB blue: trust) | `#6C86FF` | 10.75 / 6.12 | Tadelakt grain + check grid | White / grey | Light |
| guideomra.ma | `#146C3C` Fassi green | `#4CC47F` | 6.48 / 8.97 | 8-point zellige star | Warm paper / sand | Light |
| omra-ramadan.ma | `#23266B` night indigo + gold `#E0B451` | `#E0B451` | 13.45 / 10.20 | Moucharabieh lattice + crescent line | Indigo-black `#0E1030` | **Dark** |
| prixomra.ma | `#8F5B00` saffron ink | `#F0B23A` | 5.73 / 10.50 | Square zellige grid (data) | White / grey | Light |
| voyageomra.ma | `#A3401E` terracotta | `#F08A5D` | 6.35 / 8.01 | Route line + stamp ring | Warm paper / sand | Light |
| omracasablanca.ma | `#0B6E69` Art Deco teal | `#4CC2B8` | 6.09 / 9.16 | Art Deco fan / ironwork | White / grey | Light |
| omrarabat.ma | `#0F6CA8` Oudayas azure | `#5FB0E8` | 5.63 / 8.35 | Andalusian garden quatrefoil | White / grey | Light |
| offresomra.ma | `#A3305C` Marrakech rose | `#F07FAA` | 6.70 / 7.85 | Horseshoe arch row | White / grey | Light |

Contrast = accent on `#FFFFFF` / on-dark accent on `#0A0A0A`. All ≥ 4.5:1.

## 4. Tokens (CSS custom properties every theme sets)

```css
:root{
  --accent:#146C3C; --accent-ink:#0E4F2C; --accent-soft:#E3F1E8; --accent-on-dark:#4CC47F;
  --black:#0A0A0A; --bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#F4F4F4; --line:#E6E6E6;
  --ink:#1A1A1A; --ink-2:#444444; --ink-3:#767676;
  --ok:#1F8A4C; --ok-soft:#E4F3EA; --warn:#B86E00; --warn-soft:#FBEFD9; --danger:#C8102E; --danger-soft:#FBE3E6;
  --serif:'DM Serif Display',Georgia,serif; --sans:'DM Sans',system-ui,sans-serif; --mono:'DM Mono',ui-monospace,Menlo,monospace;
  --sans-ar:'IBM Plex Sans Arabic',system-ui,sans-serif; --display-ar:'Noto Kufi Arabic','IBM Plex Sans Arabic',sans-serif;
  --radius:2px; --seam:2px; --pattern:url("data:image/svg+xml,…");
}
/* dark: surfaces #0A0A0A → #141414 → #1E1E1E, line #2A2A2A, ink #F2F2F2/#C4C4C4/#8A8A8A, accent → --accent-on-dark */
```

The shared base stylesheet implements every component from these tokens; a site theme changes **tokens, pattern, labels and layout variant** only (plus small site-specific rules), so the system stays one and each site still looks like its own publication.

## 5. Components (HTML/CSS, zero JS unless noted)

| Component | Spec |
|---|---|
| Header | White bar (dark on omra-ramadan), wordmark = site name in DM Serif Display + small « par Wiki Tours » label; nav in DM Sans 600; language switcher FR · العربية · EN as text links; 2 px bottom line. |
| Cover band | See §1; holds H1, the short answer or tagline, and one primary CTA. |
| Answer box (`:::answer`) | Surface-2 fill, 4 px accent start border, label (« Réponse courte » / « الجواب المختصر » / « Short answer », wording varies per site), 40–60 words. |
| Key facts (`:::retenir`) | Table, 11 px caps header on surface-2, rows 44 px, numbers tabular, source superscripts in DM Mono. |
| Unknowns (`:::unknown`) | Warn-soft fill, warn start border, text label. |
| Disclosure (`:::disclosure`) | Black band, white text, accent start border. |
| Steps (`:::steps`) | Numbered list, number in DM Serif Display accent, 2 px seam between steps. |
| CTA (`:::cta`) | Primary button (accent), secondary text link; never inside tables. |
| Cards | 2 px-seam grids; title serif 22 px; label caps; no shadows; hover = accent start border. |
| Tables | 0 radius, 11 px caps header, horizontal scroll inside a bordered wrapper on phones. |
| Pills | 24 px, caps 11 px, semantic soft fills (confirmé / estimé / à vérifier). |
| Footer | Black, ownership line « Publié par Wiki Tours International, agence de voyages, Casablanca » → /editeur/, trust links, no sister-site link block. |
| Tool (offresomra comparator) | Inputs 44 px, labels above (11 px caps), results table; small vanilla JS, no storage, no network. |

## 6. Fonts and performance

**Self-hosted** (no third-party requests, STRATEGY §10.7/§10.10): WOFF2 files from the `@fontsource/*` npm packages, copied at build into each site's `/assets/fonts/`, with `font-display: swap`. Only the weights and subsets used: DM Serif Display 400; DM Sans 400/600/700; DM Mono 400 (latin + latin-ext); IBM Plex Sans Arabic 400/600 and Noto Kufi Arabic 700 (arabic subset) — Arabic families are applied only on `/ar/` pages, so French and English pages never download them. Preload one file (the body face of the page's language). System fallbacks keep layout stable. Target LCP ≤ 2.5 s, CLS ≤ 0.1.

## 7. RTL

`dir="rtl"` on `/ar/`; logical properties only (`margin-inline-start`, `border-inline-start`, `text-align:start`); directional icons mirrored; numbers in Western digits (Intl `ar-MA`).
