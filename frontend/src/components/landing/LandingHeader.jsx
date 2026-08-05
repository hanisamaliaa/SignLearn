import { useEffect, useId, useState } from "react";
import { MenuIcon, SettingsIcon, XIcon } from "../ui/Icons";

const NAV_ITEMS = [
  { label: "Belajar", href: "#topik" },
  { label: "Permainan", href: "#cara-belajar" },
  { label: "Penerjemah", href: "#demo-gerakan" },
  { label: "Progres", href: "#progres" },
];

export default function LandingHeader({ onLogin, onRegister, onAccessibility }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  return (
    <header className={`kids-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="kids-container flex min-h-20 items-center justify-between gap-4">
        <a href="#main-content" className="kids-brand" aria-label="SignLearn Kids, beranda">
          <span className="kids-brand-mark" aria-hidden="true">SL</span>
          <span>SignLearn <strong>Kids</strong></span>
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item, index) => (
            <a key={item.href} href={item.href} className={`kids-nav-link ${index === 0 ? "is-active" : ""}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex lg:ml-0">
          <button type="button" className="kids-icon-button" onClick={onAccessibility} aria-label="Buka pengaturan aksesibilitas" title="Aksesibilitas">
            <SettingsIcon size={20} />
          </button>
          <button type="button" className="kids-button kids-button-secondary" onClick={onLogin}>Masuk</button>
          <button type="button" className="kids-button kids-button-primary" onClick={onRegister}>Mulai Belajar</button>
        </div>
        <button type="button" className="kids-icon-button lg:hidden" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true">{menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}</span>
        </button>
      </div>
      <nav id={menuId} className={`kids-mobile-menu ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi seluler">
        <div className="kids-container flex flex-col gap-1 py-4">
          {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className="kids-mobile-link" onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          <button type="button" className="kids-mobile-link text-left" onClick={onAccessibility}>Pengaturan Aksesibilitas</button>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#D7E3EA] pt-4">
            <button type="button" className="kids-button kids-button-secondary" onClick={onLogin}>Masuk</button>
            <button type="button" className="kids-button kids-button-primary" onClick={onRegister}>Mulai Belajar</button>
          </div>
        </div>
      </nav>
    </header>
  );
}
