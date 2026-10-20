// Theme stub for voyageomra.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#f6efe2","fg":"#2e2418","muted":"#62533f","primary":"#8f4424","accent":"#c98a2b","surface":"#ecdfc7","border":"#d4c09c"},
  fonts: ['system'],
  layout: { header: 'stacked', home: ["hero","pillars","intro","latest","cta","about"] },
  sectionOrder: ["body","cluster","cta","faq","sources","related"],
  labels: {
    fr: {
      "answer": "Réponse rapide",
      "retenir": "Check-list",
      "unknown": "À confirmer avant le départ",
      "disclosure": "Éditeur",
      "disclosureText": "Voyage Omra est édité par Wiki Tours International, agence de voyages. Les offres de l'agence sont toujours signalées.",
      "ctaTitle": "On s'occupe des vols et des hôtels ?"
    },
  },
  templates: {},
};
