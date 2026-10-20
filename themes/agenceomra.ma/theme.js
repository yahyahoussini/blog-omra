// Theme for agenceomra.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#1A1BBF",
    "accent-ink": "#13138A",
    "accent-soft": "#E4E4F7",
    "accent-on-dark": "#6C86FF",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M0 24h48M24 0v48" stroke="#fff" fill="none" stroke-width="1.5"/><path d="M8 8h2M30 14h2M14 34h2M38 40h2" stroke="#fff" fill="none" stroke-width="1.5"/></svg>',
  layout: {"header":"stacked","home":["hero","intro","pillars","latest","about","cta"]},
  sectionOrder: ["body","faq","sources","cta","related"],
  labels: {
    "fr": {
      "answer": "Réponse directe",
      "retenir": "Points de contrôle",
      "unknown": "Zones encore floues",
      "disclosure": "À savoir sur cet éditeur",
      "disclosureText": "agenceomra.ma est publié par Wiki Tours International, agence de voyages. Nous ne classons pas les agences.",
      "ctaTitle": "Une question à poser à une agence agréée ?"
    },
    "ar": {
      "answer": "الجواب المباشر",
      "retenir": "نقاط المراقبة",
      "unknown": "مناطق ما زالت غامضة",
      "disclosure": "عن ناشر هذا الموقع",
      "disclosureText": "ينشر agenceomra.ma وكالة الأسفار Wiki Tours International. نحن لا نرتب الوكالات.",
      "ctaTitle": "سؤال تريد طرحه على وكالة مرخصة؟"
    },
    "en": {
      "answer": "Direct answer",
      "retenir": "Checkpoints",
      "unknown": "Still unclear",
      "disclosure": "About this publisher",
      "disclosureText": "agenceomra.ma is published by Wiki Tours International, a travel agency. We do not rank agencies.",
      "ctaTitle": "A question for a licensed agency?"
    }
  },
  templates: {},
};
