import BrandLogo from "../common/BrandLogo";
import { Reveal } from "./LandingMotion";

const GROUPS = [
  { title: "Jelajahi", links: [{ label: "Belajar", href: "#topik" }, { label: "Penerjemah", href: "#demo-gerakan" }, { label: "Permainan", href: "#cara-belajar" }, { label: "Progres", href: "#progres" }] },
  { title: "Untuk keluarga", links: [{ label: "Panduan Orang Tua", href: "#orang-tua" }, { label: "Kembali ke atas", href: "#main-content" }], id: "footer-support" },
];
export default function LandingFooter() {
  const year = new Date().getFullYear();
  return <footer className="kids-footer"><div className="kids-footer-decor" aria-hidden="true"><i /><i /><i /></div><Reveal className="kids-container kids-footer-grid"><div className="kids-footer-brand"><BrandLogo href="#main-content" ariaLabel="SignLearn Kids, kembali ke atas" /><p>Platform belajar BISINDO yang menyenangkan, aman, dan inklusif untuk anak.</p><span className="kids-footer-promise">Belajar dengan tangan, tumbuh dengan empati.</span></div>{GROUPS.map((group) => <nav key={group.title} id={group.id} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}</ul></nav>)}</Reveal><div className="kids-container kids-footer-bottom"><span>© {year} SignLearn Kids.</span><span>Belajar dan berkomunikasi untuk semua.</span></div></footer>;
}
