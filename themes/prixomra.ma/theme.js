// Theme stub for prixomra.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#f7f5f0","fg":"#2b2b2b","muted":"#5e5a52","primary":"#9c3f24","accent":"#c0573a","surface":"#ece6da","border":"#d6cdbb"},
  fonts: ['system'],
  layout: { header: 'split', home: ["hero","intro","pillars","latest","about","cta"] },
  sectionOrder: ["body","sources","faq","cta","related"],
  labels: {
    fr: {
      "answer": "Le chiffre clé",
      "retenir": "Tableau de référence",
      "unknown": "Données manquantes",
      "disclosure": "Note sur l'éditeur",
      "disclosureText": "Observatoire publié par Wiki Tours International, une agence concurrente des agences observées. Méthode et sources publiées.",
      "ctaTitle": "Besoin d'un devis ?"
    },
  },
  templates: {},
};
