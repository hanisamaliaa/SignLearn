import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { Reveal } from "./LandingMotion";
import { FOOTER_NAV_GROUPS } from "../../config/landingNavigation";
import useLandingNavigation from "../../hooks/useLandingNavigation";

function FooterLink({ destination, onSectionNavigation }) {
  if (destination.kind === "route") {
    return <Link to={destination.href}>{destination.label}</Link>;
  }

  return (
    <a
      href={destination.href}
      onClick={(event) => onSectionNavigation(event, destination)}
    >
      {destination.label}
    </a>
  );
}

export default function LandingFooter() {
  const year = new Date().getFullYear();
  const { navigateToLandingSection, scrollCurrentPageToTop } = useLandingNavigation();

  return <footer className="kids-footer"><div className="kids-footer-decor" aria-hidden="true"><i /><i /><i /></div><Reveal className="kids-container kids-footer-grid"><div className="kids-footer-brand"><BrandLogo href="#main-content" ariaLabel="SignLearn Kids, kembali ke konten utama" /><p>Platform belajar BISINDO yang menyenangkan, aman, dan inklusif untuk anak.</p><span className="kids-footer-promise">Belajar dengan tangan, tumbuh dengan empati.</span></div>{FOOTER_NAV_GROUPS.map((group) => <nav key={group.title} id={group.id} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map((destination) => <li key={destination.label}><FooterLink destination={destination} onSectionNavigation={navigateToLandingSection} /></li>)}{group.id === "footer-support" && <li><button type="button" className="kids-footer-link" onClick={scrollCurrentPageToTop}>Kembali ke atas</button></li>}</ul></nav>)}</Reveal><div className="kids-container kids-footer-bottom"><span>© {year} SignLearn Kids.</span><span>Belajar dan berkomunikasi untuk semua.</span></div></footer>;
}
