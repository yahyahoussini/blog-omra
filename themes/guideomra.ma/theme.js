// Theme stub for guideomra.ma. The site agent designs the real theme (STRATEGY 5: distinct design per site).
// API: docs/ENGINE.md -> "Theme API".
export default {
  palette: {"bg":"#fbf8f1","fg":"#1f2a24","muted":"#57625b","primary":"#0f5b4a","accent":"#b08d3c","surface":"#efe6d2","border":"#d8ccb0"},
  fonts: ['system'],
  layout: { header: 'split', home: ["hero","intro","pillars","latest","cta","about"] },
  sectionOrder: ["body","faq","cluster","cta","sources","related"],
  labels: {
    fr: {
      "answer": "L'essentiel",
      "retenir": "Repères",
      "unknown": "Ce que nous ne savons pas encore",
      "disclosure": "Qui publie ce guide",
      "disclosureText": "Ce guide est publié par Wiki Tours International, une agence de voyages. Quand une de ses offres est citée, elle est signalée comme telle.",
      "ctaTitle": "Préférez-vous être accompagné ?"
    },
  },
  templates: {},
};
