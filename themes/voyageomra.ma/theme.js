// Theme for voyageomra.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#A3401E",
    "accent-ink": "#752E16",
    "accent-soft": "#F4E8E4",
    "accent-on-dark": "#F08A5D",
    "bg": "#FBF8F2",
    "surface": "#FBF8F2",
    "surface-2": "#F3EEE4",
    "line": "#E6DED0",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48" viewBox="0 0 96 48"><g stroke="#fff" fill="none" stroke-width="1.5"><path d="M0 36C24 36 24 12 48 12s24 24 48 24" stroke-dasharray="4 4"/><circle cx="48" cy="12" r="7"/><circle cx="48" cy="12" r="3"/></g></svg>',
  layout: {"header":"stacked","home":["hero","pillars","intro","latest","cta","about"]},
  sectionOrder: ["body","cluster","cta","faq","sources","related"],
  labels: {
    "fr": {
      "answer": "Réponse rapide",
      "retenir": "Check-list",
      "unknown": "À confirmer avant le départ",
      "disclosure": "Éditeur",
      "disclosureText": "Voyage Omra est édité par Wiki Tours International, agence de voyages. Les offres de l'agence sont toujours signalées.",
      "ctaTitle": "On s'occupe des vols et des hôtels ?"
    },
    "ar": {
      "answer": "جواب سريع",
      "retenir": "قائمة التحقق",
      "unknown": "يجب تأكيده قبل السفر",
      "disclosure": "الناشر",
      "disclosureText": "ينشر Voyage Omra وكالة الأسفار Wiki Tours International. نشير دائما إلى عروض الوكالة.",
      "ctaTitle": "هل نتكفل بالرحلات والفنادق؟"
    },
    "en": {
      "answer": "Quick answer",
      "retenir": "Checklist",
      "unknown": "To confirm before you leave",
      "disclosure": "Publisher",
      "disclosureText": "Voyage Omra is published by Wiki Tours International, a travel agency. The agency's offers are always labelled.",
      "ctaTitle": "Shall we handle flights and hotels?"
    }
  },
  templates: {},
};
