import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityMenu from "../components/landing/AccessibilityMenu";
import LandingHeader from "../components/landing/LandingHeader";
import LandingFooter from "../components/landing/LandingFooter";
import {
  BenefitsSection, FinalKidsCTA, KidsHero, LearningJourneySection,
  ParentTrustSection, ProgressPreviewSection, SignDemoSection, TopicSection,
} from "../components/landing/LandingSections";
import { APP_DESTINATIONS } from "../config/landingNavigation";
import useLandingNavigation from "../hooks/useLandingNavigation";

export default function Landing() {
  const navigate = useNavigate();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const { navigateToLandingSection } = useLandingNavigation();
  const openSignDemo = () => navigateToLandingSection(null, APP_DESTINATIONS.signDemo);
  return <div className="kids-page min-h-screen"><a className="skip-link" href="#main-content">Lewati ke konten utama</a><LandingHeader onLogin={() => navigate("/login")} onRegister={() => navigate("/register")} onAccessibility={() => setAccessibilityOpen(true)} /><main id="main-content"><KidsHero onStart={() => navigate("/register")} onTrySign={openSignDemo} /><TopicSection onStart={() => navigate("/register")} /><LearningJourneySection /><SignDemoSection /><BenefitsSection /><ProgressPreviewSection onProgress={() => navigate("/login")} /><ParentTrustSection onGuide={() => navigate(APP_DESTINATIONS.parentGuide.href)} /><FinalKidsCTA onStart={() => navigate("/register")} onExplore={openSignDemo} /></main><LandingFooter /><AccessibilityMenu open={accessibilityOpen} onClose={() => setAccessibilityOpen(false)} /></div>;
}
