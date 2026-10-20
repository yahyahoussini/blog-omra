// Theme for omracasablanca.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#0B6E69",
    "accent-ink": "#084F4C",
    "accent-soft": "#E2EEED",
    "accent-on-dark": "#4CC2B8",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g stroke="#fff" fill="none" stroke-width="1.5"><path d="M0 48a24 24 0 0 1 48 0M8 48a16 16 0 0 1 32 0M16 48a8 8 0 0 1 16 0M24 24v24M24 48L7 31M24 48l17-17"/></g></svg>',
  layout: {"header":"centered","home":["hero","intro","latest","pillars","about","cta"]},
  sectionOrder: ["body","faq","cta","sources","related"],
  labels: {
    "fr": {
      "answer": "Ce qu'il faut savoir",
      "retenir": "Infos pratiques",
      "unknown": "Encore inconnu",
      "disclosure": "Transparence éditeur",
      "disclosureText": "Ce site est publié par Wiki Tours International, agence de voyages installée à Casablanca. Il n'est pas une agence en soi.",
      "ctaTitle": "Vous partez de Casablanca ?"
    },
    "ar": {
      "answer": "ما يجب معرفته",
      "retenir": "معلومات عملية",
      "unknown": "غير معروف بعد",
      "disclosure": "شفافية الناشر",
      "disclosureText": "ينشر هذا الموقع Wiki Tours International، وكالة أسفار مقرها الدار البيضاء. الموقع نفسه ليس وكالة.",
      "ctaTitle": "هل تسافر من الدار البيضاء؟"
    },
    "en": {
      "answer": "What to know",
      "retenir": "Practical information",
      "unknown": "Still unknown",
      "disclosure": "Publisher transparency",
      "disclosureText": "This site is published by Wiki Tours International, a travel agency based in Casablanca. The site itself is not an agency.",
      "ctaTitle": "Leaving from Casablanca?"
    }
  },
  templates: {},
};
