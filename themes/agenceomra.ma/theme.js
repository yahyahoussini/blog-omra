// Theme stub for agenceomra.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#ffffff","fg":"#16213a","muted":"#4d5870","primary":"#1d2f5c","accent":"#2e7d4f","surface":"#eef2f7","border":"#cdd5e1"},
  fonts: ['system'],
  layout: { header: 'stacked', home: ["hero","intro","pillars","latest","about","cta"] },
  sectionOrder: ["body","faq","sources","cta","related"],
  labels: {
    fr: {
      "answer": "Réponse directe",
      "retenir": "Points de contrôle",
      "unknown": "Zones encore floues",
      "disclosure": "À savoir sur cet éditeur",
      "disclosureText": "agenceomra.ma est publié par Wiki Tours International, agence de voyages. Nous ne classons pas les agences.",
      "ctaTitle": "Une question à poser à une agence agréée ?"
    },
  },
  templates: {},
};
