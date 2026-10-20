// Theme for omrarabat.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#0F6CA8",
    "accent-ink": "#0B4E79",
    "accent-soft": "#E2EDF5",
    "accent-on-dark": "#5FB0E8",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g stroke="#fff" fill="none" stroke-width="1.5"><path d="M24 8a8 8 0 0 1 8 8 8 8 0 0 1 0 16 8 8 0 0 1-16 0 8 8 0 0 1 0-16 8 8 0 0 1 8-8z"/><path d="M0 0h48v48H0z"/></g></svg>',
  layout: {"header":"split","home":["hero","intro","pillars","cta","latest","about"]},
  sectionOrder: ["body","cta","sources","faq","related"],
  labels: {
    "fr": {
      "answer": "Résumé",
      "retenir": "Repères pratiques",
      "unknown": "Questions ouvertes",
      "disclosure": "Qui sommes-nous",
      "disclosureText": "Omra Rabat est publié par Wiki Tours International, agence de voyages basée à Casablanca (pas de bureau à Rabat).",
      "ctaTitle": "Vous partez de Rabat-Salé ?"
    },
    "ar": {
      "answer": "ملخص",
      "retenir": "معالم عملية",
      "unknown": "أسئلة مفتوحة",
      "disclosure": "من نحن",
      "disclosureText": "ينشر Omra Rabat وكالة الأسفار Wiki Tours International ومقرها الدار البيضاء (لا مكتب لها في الرباط).",
      "ctaTitle": "هل تسافر من الرباط وسلا؟"
    },
    "en": {
      "answer": "Summary",
      "retenir": "Practical markers",
      "unknown": "Open questions",
      "disclosure": "Who we are",
      "disclosureText": "Omra Rabat is published by Wiki Tours International, a travel agency based in Casablanca (no office in Rabat).",
      "ctaTitle": "Leaving from Rabat-Salé?"
    }
  },
  templates: {},
};
