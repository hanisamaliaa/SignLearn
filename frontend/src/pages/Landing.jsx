import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityMenu from "../components/landing/AccessibilityMenu";
import LandingHeader from "../components/landing/LandingHeader";
import LandingFooter from "../components/landing/LandingFooter";
import {
  BenefitsSection, FinalKidsCTA, KidsHero, LearningJourneySection,
  ParentTrustSection, ProgressPreviewSection, SignDemoSection, TopicSection,
} from "../components/landing/LandingSections";

export default function Landing() {
  const navigate = useNavigate();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <div className="kids-page min-h-screen"><a className="skip-link" href="#main-content">Lewati ke konten utama</a><LandingHeader onLogin={() => navigate("/login")} onRegister={() => navigate("/register")} onAccessibility={() => setAccessibilityOpen(true)} /><main id="main-content"><KidsHero onStart={() => navigate("/register")} onTrySign={() => scrollTo("demo-gerakan")} /><TopicSection onStart={() => navigate("/register")} /><BenefitsSection /><LearningJourneySection /><SignDemoSection /><ProgressPreviewSection onProgress={() => navigate("/login")} /><ParentTrustSection onGuide={() => scrollTo("footer-support")} /><FinalKidsCTA onStart={() => navigate("/register")} onExplore={() => scrollTo("demo-gerakan")} /></main><LandingFooter /><AccessibilityMenu open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} /></div>;
}
