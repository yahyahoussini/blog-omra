// Theme stub for omra-ramadan.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#14173a","fg":"#f3eedd","muted":"#c9c3ae","primary":"#e6c36a","accent":"#e6c36a","surface":"#1f2452","border":"#3a4078","link":"#f0d48a"},
  fonts: ['system'],
  layout: { header: 'centered', home: ["hero","intro","latest","pillars","cta","about"] },
  sectionOrder: ["body","cta","faq","sources","related"],
  labels: {
    fr: {
      "answer": "En bref",
      "retenir": "Les dates à retenir",
      "unknown": "Pas encore annoncé",
      "disclosure": "Transparence",
      "disclosureText": "omra-ramadan.ma appartient à Wiki Tours International, agence de voyages à Casablanca. Toute offre de l'agence est présentée comme telle.",
      "ctaTitle": "Vous visez le Ramadan ?"
    },
  },
  templates: {},
};
