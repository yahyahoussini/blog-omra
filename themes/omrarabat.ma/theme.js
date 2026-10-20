// Theme stub for omrarabat.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#f7fafc","fg":"#14273d","muted":"#4a5d70","primary":"#2b6cb0","accent":"#4f7a4a","surface":"#e6eff7","border":"#c4d4e3"},
  fonts: ['system'],
  layout: { header: 'split', home: ["hero","intro","pillars","cta","latest","about"] },
  sectionOrder: ["body","cta","sources","faq","related"],
  labels: {
    fr: {
      "answer": "Résumé",
      "retenir": "Repères pratiques",
      "unknown": "Questions ouvertes",
      "disclosure": "Qui sommes-nous",
      "disclosureText": "Omra Rabat est publié par Wiki Tours International, agence de voyages basée à Casablanca (pas de bureau à Rabat).",
      "ctaTitle": "Vous partez de Rabat-Salé ?"
    },
  },
  templates: {},
};
