function landingSection(label, id) {
  return Object.freeze({
    kind: "landing-section",
    label,
    id,
    hash: `#${id}`,
    href: `/#${id}`,
  });
}

function route(label, href) {
  return Object.freeze({ kind: "route", label, href });
}

export const APP_DESTINATIONS = Object.freeze({
  home: landingSection("Beranda", "beranda"),
  topics: landingSection("Yuk Belajar", "topik"),
  howToLearn: landingSection("Cara Belajar", "cara-belajar"),
  signDemo: landingSection("Coba Gerakan", "demo-gerakan"),
  progress: landingSection("Progresku", "progres"),
  parents: landingSection("Untuk Orang Tua", "orang-tua"),
  parentGuide: route("Panduan Orang Tua", "/parent-guide"),
  aboutBisindo: route("Tentang BISINDO", "/about-bisindo"),
  privacyPolicy: route("Kebijakan Privasi", "/privacy-policy"),
});

export const LANDING_NAV_ITEMS = [
  APP_DESTINATIONS.home,
  APP_DESTINATIONS.topics,
  APP_DESTINATIONS.howToLearn,
  APP_DESTINATIONS.signDemo,
  APP_DESTINATIONS.parents,
];

export const FOOTER_NAV_GROUPS = [
  {
    title: "Yuk jelajahi",
    links: [
      APP_DESTINATIONS.topics,
      APP_DESTINATIONS.signDemo,
      APP_DESTINATIONS.howToLearn,
      APP_DESTINATIONS.progress,
    ],
  },
  {
    title: "Untuk keluarga",
    id: "footer-support",
    links: [
      APP_DESTINATIONS.parentGuide,
      APP_DESTINATIONS.aboutBisindo,
      APP_DESTINATIONS.privacyPolicy,
    ],
  },
];

const LANDING_SECTION_IDS = new Set(
  Object.values(APP_DESTINATIONS)
    .filter((destination) => destination.kind === "landing-section")
    .map((destination) => destination.id),
);

export function getLandingSectionId(hash = "") {
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    return LANDING_SECTION_IDS.has(id) ? id : null;
  } catch {
    return null;
  }
}
