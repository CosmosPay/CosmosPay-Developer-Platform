/* The platform's languages, in the order the language picker lists them. Each has a catalog in
   src/lib/i18n/messages (tests/unit/dashboardI18n.test.ts keeps the two in step). */
/* code → { label (nav chip), name (native), flag (Flag svg key) } */
export const LOCALES = [
  { code: "en", label: "EN", name: "English", flag: "EN" },
  { code: "es", label: "ES", name: "Español", flag: "ES" },
  { code: "pt", label: "PT", name: "Português", flag: "PT" },
  { code: "fr", label: "FR", name: "Français", flag: "FR" },
  { code: "de", label: "DE", name: "Deutsch", flag: "DE" },
  { code: "hi", label: "HI", name: "हिन्दी", flag: "IN" },
  { code: "zh", label: "ZH", name: "中文", flag: "CN" },
];
