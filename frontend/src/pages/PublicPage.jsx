import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityMenu from "../components/landing/AccessibilityMenu";
import LandingHeader from "../components/landing/LandingHeader";
import LandingFooter from "../components/landing/LandingFooter";

export default function PublicPage({ eyebrow, title, intro, children }) {
  const navigate = useNavigate();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

  return (
    <div className="kids-page min-h-screen">
      <LandingHeader
        onLogin={() => navigate("/login")}
        onRegister={() => navigate("/register")}
        onAccessibility={() => setAccessibilityOpen(true)}
      />
      <main id="main-content">
        <section className="kids-container py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-wider">{eyebrow}</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold">{title}</h1>
            <p className="mt-5 text-lg leading-8 max-w-3xl">{intro}</p>
          </div>
          <div className="mt-14 max-w-5xl">{children}</div>
        </section>
      </main>
      <LandingFooter />
      <AccessibilityMenu
        open={accessibilityOpen}
        onClose={() => setAccessibilityOpen(false)}
      />
    </div>
  );
}
