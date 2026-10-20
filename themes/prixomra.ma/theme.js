// Theme for prixomra.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#8F5B00",
    "accent-ink": "#674200",
    "accent-soft": "#F2EBE0",
    "accent-on-dark": "#F0B23A",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g stroke="#fff" fill="none" stroke-width="1.5"><rect x="4" y="4" width="32" height="32"/><rect x="12" y="12" width="16" height="16" transform="rotate(45 20 20)"/></g></svg>',
  layout: {"header":"split","home":["hero","intro","pillars","latest","about","cta"]},
  sectionOrder: ["body","sources","faq","cta","related"],
  labels: {
    "fr": {
      "answer": "Le chiffre clé",
      "retenir": "Tableau de référence",
      "unknown": "Données manquantes",
      "disclosure": "Note sur l'éditeur",
      "disclosureText": "Observatoire publié par Wiki Tours International, une agence concurrente des agences observées. Méthode et sources publiées.",
      "ctaTitle": "Besoin d'un devis ?"
    },
    "ar": {
      "answer": "الرقم الأساسي",
      "retenir": "جدول مرجعي",
      "unknown": "معطيات ناقصة",
      "disclosure": "ملاحظة عن الناشر",
      "disclosureText": "مرصد تنشره Wiki Tours International، وهي وكالة منافسة للوكالات التي نرصدها. المنهجية والمصادر منشورة.",
      "ctaTitle": "تحتاج إلى عرض سعر؟"
    },
    "en": {
      "answer": "The key figure",
      "retenir": "Reference table",
      "unknown": "Missing data",
      "disclosure": "Note on the publisher",
      "disclosureText": "An observatory published by Wiki Tours International, a competitor of the agencies it observes. Method and sources are published.",
      "ctaTitle": "Need a quote?"
    }
  },
  templates: {},
};
