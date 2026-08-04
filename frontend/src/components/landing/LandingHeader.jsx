import { useEffect, useId, useState } from "react";
import { MenuIcon, XIcon } from "../ui/Icons";

const NAV_ITEMS = [
  { label: "Tentang", href: "#tentang" },
  { label: "Kursus", href: "#kursus" },
  { label: "Cara Belajar", href: "#cara-belajar" },
  { label: "Aksesibilitas", href: "#aksesibilitas" },
];

export default function LandingHeader({ onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState("#tentang");
  const menuId = useId();

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    const handleHash = () => setActiveHash(window.location.hash || "#tentang");
    handleScroll();
    handleHash();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleHash);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`landing-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="landing-container flex min-h-18 items-center justify-between gap-4">
        <a href="#main-content" className="brand-link" aria-label="SignLearn, beranda">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SignLearn</span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`landing-nav-link ${activeHash === item.href ? "is-active" : ""}`}
              aria-current={activeHash === item.href ? "location" : undefined}
              onClick={() => setActiveHash(item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex lg:ml-0">
          <button type="button" className="landing-button landing-button-ghost" onClick={onLogin}>
            Masuk
          </button>
          <button type="button" className="landing-button landing-button-primary" onClick={onRegister}>
            Daftar Gratis
          </button>
        </div>

        <button
          type="button"
          className="landing-icon-button lg:hidden"
          aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`menu-icon-state ${menuOpen ? "is-open" : ""}`} aria-hidden="true">
            {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </span>
        </button>
      </div>

      <nav
        id={menuId}
        aria-label="Navigasi seluler"
        className={`landing-mobile-menu ${menuOpen ? "is-open" : ""}`}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="landing-mobile-link" onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <button type="button" className="landing-button landing-button-secondary" onClick={onLogin}>
              Masuk
            </button>
            <button type="button" className="landing-button landing-button-primary" onClick={onRegister}>
              Daftar Gratis
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
