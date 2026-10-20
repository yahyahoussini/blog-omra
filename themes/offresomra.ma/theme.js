// Theme for offresomra.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#A3305C",
    "accent-ink": "#752342",
    "accent-soft": "#F4E6EB",
    "accent-on-dark": "#F07FAA",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><g stroke="#fff" fill="none" stroke-width="1.5"><path d="M6 48V22a14 14 0 1 1 28 0v26"/><path d="M12 48V24a8 8 0 1 1 16 0v24"/></g></svg>',
  layout: {"header":"stacked","home":["hero","intro","pillars","latest","cta","about"]},
  sectionOrder: ["body","faq","cta","sources","related"],
  labels: {
    "fr": {
      "answer": "Réponse courte",
      "retenir": "À vérifier dans l'offre",
      "unknown": "Ce qui reste à éclaircir",
      "disclosure": "Offre de l'éditeur",
      "disclosureText": "Offres Omra est publié par Wiki Tours International, agence de voyages. Ses propres offres portent la mention « Offre de l'éditeur ».",
      "ctaTitle": "Une offre à faire relire ?"
    },
    "ar": {
      "answer": "جواب مختصر",
      "retenir": "ما يجب التحقق منه في العرض",
      "unknown": "ما يبقى غير واضح",
      "disclosure": "عرض الناشر",
      "disclosureText": "ينشر Offres Omra وكالة الأسفار Wiki Tours International. تحمل عروضها الخاصة عبارة «عرض الناشر».",
      "ctaTitle": "عرض تريد مراجعته؟"
    },
    "en": {
      "answer": "Short answer",
      "retenir": "What to check in the offer",
      "unknown": "What remains unclear",
      "disclosure": "Publisher's offer",
      "disclosureText": "Offres Omra is published by Wiki Tours International, a travel agency. Its own offers carry the label « Publisher's offer ».",
      "ctaTitle": "An offer you want checked?"
    }
  },
  templates: {},
};
