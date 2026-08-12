import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SettingsIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";
import { useReducedMotion } from "../../hooks/useLandingMotion";
import { getLandingSectionId, LANDING_NAV_ITEMS } from "../../config/landingNavigation";
import useLandingNavigation from "../../hooks/useLandingNavigation";

export default function LandingHeader({ onLogin, onRegister, onAccessibility }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState(() => {
    if (typeof window === "undefined") return "#beranda";
    const sectionId = getLandingSectionId(window.location.hash);
    return sectionId ? `#${sectionId}` : "#beranda";
  });
  const reducedMotion = useReducedMotion();
  const menuId = useId();
  const menuToggleRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const { navigateToLandingSection } = useLandingNavigation();

  const navigateToSection = (event, item) => {
    setMenuOpen(false);
    setActiveHash(item.hash);
    navigateToLandingSection(event, item);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(mobileMenuRef.current?.querySelectorAll("a[href], button:not([disabled])") ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    requestAnimationFrame(() => mobileMenuRef.current?.querySelector("a[href]")?.focus());
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  useEffect(() => {
    const sections = LANDING_NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!sections.length) return undefined;

    const updateFromHash = () => {
      const sectionId = getLandingSectionId(window.location.hash);
      if (sectionId) setActiveHash(`#${sectionId}`);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio || Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible[0]) setActiveHash(`#${visible[0].target.id}`);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0.05, 0.2, 0.4] },
    );

    sections.forEach((section) => observer.observe(section));
    window.addEventListener("hashchange", updateFromHash);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", updateFromHash);
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
      <div className="kids-container kids-navbar">
        <div className="kids-nav-brand">
          <BrandLogo href="/#beranda" onClick={(event) => navigateToSection(event, LANDING_NAV_ITEMS[0])} />
        </div>
        <nav className="kids-nav-links" aria-label="Navigasi utama">
          {LANDING_NAV_ITEMS.map((item) => {
            const active = activeHash === item.hash;
            return (
            <a key={item.href} href={item.href} className={`kids-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "location" : undefined} onClick={(event) => navigateToSection(event, item)}>
              {item.label}
              {active && <motion.span layoutId="kids-nav-indicator" className="kids-nav-active-indicator" transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }} />}
            </a>
            );
          })}
        </nav>
        <div className="kids-nav-actions">
          <button type="button" className="kids-icon-button" onClick={onAccessibility} aria-label="Buka pengaturan aksesibilitas" title="Aksesibilitas">
            <SettingsIcon size={20} />
          </button>
          <button type="button" className="kids-button kids-button-secondary" onClick={onLogin}>Masuk</button>
          <button type="button" className="kids-button kids-button-yellow" onClick={onRegister}>Mulai Belajar</button>
        </div>
        <button ref={menuToggleRef} type="button" className="kids-icon-button kids-menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)}>
          <span className={`kids-menu-glyph ${menuOpen ? "is-open" : ""}`} aria-hidden="true"><i /><i /><i /></span>
        </button>
      </div>
      <button type="button" className={`kids-mobile-overlay ${menuOpen ? "is-open" : ""}`} aria-label="Tutup menu navigasi" tabIndex="-1" onClick={() => { setMenuOpen(false); menuToggleRef.current?.focus(); }} />
      <nav ref={mobileMenuRef} id={menuId} className={`kids-mobile-menu ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi seluler">
        <div className="kids-container flex flex-col gap-1 py-4">
          {LANDING_NAV_ITEMS.map((item) => {
            return <a key={item.href} href={item.href} className={`kids-mobile-link ${activeHash === item.hash ? "is-active" : ""}`} aria-current={activeHash === item.hash ? "location" : undefined} onClick={(event) => navigateToSection(event, item)}>{item.label}</a>;
          })}
          <button type="button" className="kids-mobile-link text-left" onClick={() => { setMenuOpen(false); menuToggleRef.current?.focus(); onAccessibility(); }}>Pengaturan Aksesibilitas</button>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#D7E3EA] pt-4">
            <button type="button" className="kids-button kids-button-secondary" onClick={() => { setMenuOpen(false); onLogin(); }}>Masuk</button>
            <button type="button" className="kids-button kids-button-yellow" onClick={() => { setMenuOpen(false); onRegister(); }}>Mulai Belajar</button>
          </div>
        </div>
      </nav>
    </header>
  );
}
