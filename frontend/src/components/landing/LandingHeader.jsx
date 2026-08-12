import { useEffect, useId, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { MenuIcon, SettingsIcon, XIcon } from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";
import { useReducedMotion } from "../../hooks/useLandingMotion";

const NAV_ITEMS = [
  { label: "Belajar", href: "/#topik" },
  { label: "Penerjemah", href: "/#demo-gerakan" },
  { label: "Permainan", href: "/#cara-belajar" },
  { label: "Progres", href: "/#progres" },
];
const STICKY_NAV_OFFSET = 70;
const DIRECT_LOAD_OFFSET = 72;

export default function LandingHeader({ onLogin, onRegister, onAccessibility }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState(() => {
    if (typeof window === "undefined") return "#topik";
    const hash = window.location.hash;
    return hash && NAV_ITEMS.some((item) => item.href.endsWith(hash)) ? hash : "#topik";
  });
  const reducedMotion = useReducedMotion();
  const menuId = useId();

  const navigateToSection = (event, href) => {
    const hash = `#${href.split("#")[1]}`;
    const target = document.querySelector(hash);
    if (!target) return;
    event.preventDefault();
    setActiveHash(hash);
    setMenuOpen(false);
    if (menuOpen) document.body.style.overflow = "";
    window.history.pushState(null, "", href);
    const headerHeight = document.querySelector(".kids-header")?.getBoundingClientRect().height || STICKY_NAV_OFFSET;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  };

  useLayoutEffect(() => {
    const hash = window.location.hash;
    if (!hash || !NAV_ITEMS.some((item) => item.href.endsWith(hash))) return;
    const target = document.querySelector(hash);
    if (!target) return;
    let cancelled = false;
    const alignTarget = () => {
      if (!cancelled) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - DIRECT_LOAD_OFFSET, behavior: "auto" });
    };
    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        alignTarget();
      });
    });
    document.fonts?.ready.then(alignTarget);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, []);

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
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.href.split("#")[1])).filter(Boolean);
    if (!sections.length) return undefined;

    const updateFromHash = () => {
      const hash = window.location.hash;
      if (hash && NAV_ITEMS.some((item) => item.href.endsWith(hash))) setActiveHash(hash);
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
          <BrandLogo href="#main-content" />
        </div>
        <nav className="kids-nav-links" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => {
            const itemHash = `#${item.href.split("#")[1]}`;
            const active = activeHash === itemHash;
            return (
            <a key={item.href} href={item.href} className={`kids-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "location" : undefined} onClick={(event) => navigateToSection(event, item.href)}>
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
        <button type="button" className="kids-icon-button kids-menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true">{menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}</span>
        </button>
      </div>
      <nav id={menuId} className={`kids-mobile-menu ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi seluler">
        <div className="kids-container flex flex-col gap-1 py-4">
          {NAV_ITEMS.map((item) => {
            const itemHash = `#${item.href.split("#")[1]}`;
            return <a key={item.href} href={item.href} className={`kids-mobile-link ${activeHash === itemHash ? "is-active" : ""}`} aria-current={activeHash === itemHash ? "location" : undefined} onClick={(event) => navigateToSection(event, item.href)}>{item.label}</a>;
          })}
          <button type="button" className="kids-mobile-link text-left" onClick={() => { setMenuOpen(false); onAccessibility(); }}>Pengaturan Aksesibilitas</button>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#D7E3EA] pt-4">
            <button type="button" className="kids-button kids-button-secondary" onClick={() => { setMenuOpen(false); onLogin(); }}>Masuk</button>
            <button type="button" className="kids-button kids-button-yellow" onClick={() => { setMenuOpen(false); onRegister(); }}>Mulai Belajar</button>
          </div>
        </div>
      </nav>
    </header>
  );
}
