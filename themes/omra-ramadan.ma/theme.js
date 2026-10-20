// Theme for omra-ramadan.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#23266B",
    "accent-ink": "#191B4D",
    "accent-soft": "#E6E7F4",
    "accent-on-dark": "#E0B451",
    "dark": {
      "bg": "#0E1030",
      "surface": "#14173A",
      "surface-2": "#1C2050",
      "line": "#2C3170",
      "accent-soft": "#1C2050"
    },
    "default": "dark"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g stroke="#fff" fill="none" stroke-width="1.5"><path d="M0 0l48 48M48 0L0 48M24 0l24 24-24 24L0 24z"/><path d="M27 20a6 6 0 1 0 0 8 5 5 0 1 1 0-8z"/></g></svg>',
  layout: {"header":"centered","home":["hero","intro","latest","pillars","cta","about"]},
  sectionOrder: ["body","cta","faq","sources","related"],
  labels: {
    "fr": {
      "answer": "En bref",
      "retenir": "Les dates à retenir",
      "unknown": "Pas encore annoncé",
      "disclosure": "Transparence",
      "disclosureText": "omra-ramadan.ma appartient à Wiki Tours International, agence de voyages à Casablanca. Toute offre de l'agence est présentée comme telle.",
      "ctaTitle": "Vous visez le Ramadan ?"
    },
    "ar": {
      "answer": "باختصار",
      "retenir": "تواريخ يجب تذكرها",
      "unknown": "لم يعلن بعد",
      "disclosure": "شفافية",
      "disclosureText": "موقع omra-ramadan.ma مملوك لوكالة الأسفار Wiki Tours International بالدار البيضاء. كل عرض للوكالة يقدم على أنه كذلك.",
      "ctaTitle": "هل تخطط لعمرة في رمضان؟"
    },
    "en": {
      "answer": "In short",
      "retenir": "Dates to remember",
      "unknown": "Not announced yet",
      "disclosure": "Transparency",
      "disclosureText": "omra-ramadan.ma belongs to Wiki Tours International, a travel agency in Casablanca. Any offer from the agency is presented as such.",
      "ctaTitle": "Planning Umrah in Ramadan?"
    }
  },
  templates: {},
};
