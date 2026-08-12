export const LANDING_NAV_ITEMS = [
  { label: "Beranda", id: "beranda" },
  { label: "Belajar", id: "topik" },
  { label: "Manfaat", id: "manfaat" },
  { label: "Cara Belajar", id: "cara-belajar" },
  { label: "Penerjemah", id: "demo-gerakan" },
  { label: "Progres", id: "progres" },
  { label: "Orang Tua", id: "orang-tua" },
].map((item) => ({ ...item, hash: `#${item.id}`, href: `/#${item.id}` }));

export const LANDING_SECTION_IDS = new Set(LANDING_NAV_ITEMS.map((item) => item.id));

export function getLandingSectionId(hash = "") {
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    return LANDING_SECTION_IDS.has(id) ? id : null;
  } catch {
    return null;
  }
}
