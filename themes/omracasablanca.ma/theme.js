// Theme stub for omracasablanca.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#fdfbf6","fg":"#1b2a36","muted":"#4f5f6b","primary":"#1f5f8b","accent":"#c9a96e","surface":"#f4ecd8","border":"#dccfb0"},
  fonts: ['system'],
  layout: { header: 'centered', home: ["hero","intro","latest","pillars","about","cta"] },
  sectionOrder: ["body","faq","cta","sources","related"],
  labels: {
    fr: {
      "answer": "Ce qu'il faut savoir",
      "retenir": "Infos pratiques",
      "unknown": "Encore inconnu",
      "disclosure": "Transparence éditeur",
      "disclosureText": "Ce site est publié par Wiki Tours International, agence de voyages installée à Casablanca. Il n'est pas une agence en soi.",
      "ctaTitle": "Vous partez de Casablanca ?"
    },
  },
  templates: {},
};
