const FOOTER_LINKS = [
  { label: "Tentang", href: "#tentang" },
  { label: "Kursus", href: "#kursus" },
  { label: "Cara Belajar", href: "#cara-belajar" },
  { label: "Aksesibilitas", href: "#aksesibilitas" },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-700 bg-slate-950 py-10 text-slate-200">
      <div className="landing-container flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <Reveal>
          <a href="#main-content" className="brand-link text-white" aria-label="SignLearn, kembali ke atas">
            <span className="brand-mark" aria-hidden="true">S</span>
            <span>SignLearn</span>
          </a>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Platform pembelajaran Bahasa Isyarat Indonesia yang visual,
            terstruktur, dan mendukung komunikasi yang lebih inklusif.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            SignLearn adalah platform pendidikan, bukan layanan diagnosis atau terapi.
          </p>
        </Reveal>
        <Reveal delay={80} as="nav" className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Navigasi footer">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="footer-link">{link.label}</a>
          ))}
        </Reveal>
      </div>
      <div className="landing-container mt-8 border-t border-slate-800 pt-6 text-sm text-slate-400">
        © {new Date().getFullYear()} SignLearn. Proyek pembelajaran BISINDO.
      </div>
    </footer>
  );
}
import { Reveal } from "./LandingMotion";
