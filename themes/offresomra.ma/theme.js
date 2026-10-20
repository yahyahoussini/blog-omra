// Theme stub for offresomra.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#fffdf7","fg":"#3b2a1a","muted":"#6b5a48","primary":"#8a5a00","accent":"#e0a100","surface":"#fbf0d6","border":"#e7d3a6"},
  fonts: ['system'],
  layout: { header: 'stacked', home: ["hero","intro","pillars","latest","cta","about"] },
  sectionOrder: ["body","faq","cta","sources","related"],
  labels: {
    fr: {
      "answer": "Réponse courte",
      "retenir": "À vérifier dans l'offre",
      "unknown": "Ce qui reste à éclaircir",
      "disclosure": "Offre de l'éditeur",
      "disclosureText": "Offres Omra est publié par Wiki Tours International, agence de voyages. Ses propres offres portent la mention « Offre de l'éditeur ».",
      "ctaTitle": "Une offre à faire relire ?"
    },
  },
  templates: {},
};
