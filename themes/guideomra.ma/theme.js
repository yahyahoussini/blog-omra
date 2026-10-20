// Theme for guideomra.ma — BrandHUB Omra (docs/DESIGN.md §3). The engine builds the page CSS from
// themes/_base/base.css + these tokens + style.css. API: docs/ENGINE.md -> "Theme API".
export default {
  tokens: {
    "accent": "#146C3C",
    "accent-ink": "#0E4E2B",
    "accent-soft": "#E3EDE8",
    "accent-on-dark": "#4CC47F",
    "bg": "#FBF8F2",
    "surface": "#FBF8F2",
    "surface-2": "#F3EEE4",
    "line": "#E6DED0",
    "default": "light"
  },
  // Zellige-style pattern, white strokes: shown at ≤ 8% in the black cover band and as the footer divider.
  pattern: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g stroke="#fff" fill="none" stroke-width="1.5"><rect x="18" y="18" width="28" height="28"/><rect x="18" y="18" width="28" height="28" transform="rotate(45 32 32)"/><circle cx="32" cy="32" r="6"/></g></svg>',
  layout: {"header":"split","home":["hero","intro","pillars","latest","cta","about"]},
  sectionOrder: ["body","faq","cluster","cta","sources","related"],
  labels: {
    "fr": {
      "answer": "L'essentiel",
      "retenir": "Repères",
      "unknown": "Ce que nous ne savons pas encore",
      "disclosure": "Qui publie ce guide",
      "disclosureText": "Ce guide est publié par Wiki Tours International, une agence de voyages. Quand une de ses offres est citée, elle est signalée comme telle.",
      "ctaTitle": "Préférez-vous être accompagné ?"
    },
    "ar": {
      "answer": "الخلاصة",
      "retenir": "معالم أساسية",
      "unknown": "ما لا نعرفه بعد",
      "disclosure": "من ينشر هذا الدليل",
      "disclosureText": "ينشر هذا الدليل Wiki Tours International، وهي وكالة أسفار. عند ذكر أحد عروضها نشير إلى ذلك بوضوح.",
      "ctaTitle": "هل تفضل أن يرافقك أحد؟"
    },
    "en": {
      "answer": "The essentials",
      "retenir": "Key markers",
      "unknown": "What we do not know yet",
      "disclosure": "Who publishes this guide",
      "disclosureText": "This guide is published by Wiki Tours International, a travel agency. When one of its offers is mentioned, it is labelled as such.",
      "ctaTitle": "Would you rather have help?"
    }
  },
  templates: {},
};
