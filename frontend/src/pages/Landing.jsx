import { useNavigate } from "react-router-dom";
import LandingHeader from "../components/landing/LandingHeader";
import {
  AccessibilitySection,
  AudienceSection,
  HeroSection,
  LearningStepsSection,
  ProductStatistics,
} from "../components/landing/LandingSections";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page min-h-screen bg-[var(--color-background)] text-[var(--color-text-900)]">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <LandingHeader
        onLogin={() => navigate("/login")}
        onRegister={() => navigate("/register")}
      />
      <main id="main-content">
        <HeroSection
          onRegister={() => navigate("/register")}
          onLearnMore={() => {
            document.getElementById("cara-belajar")?.scrollIntoView();
          }}
        />
        <ProductStatistics />
        <AudienceSection />
        <LearningStepsSection />
        <AccessibilitySection />
        <section className="landing-section pt-0" aria-labelledby="cta-title">
          <div className="landing-container">
            <div className="rounded-[24px] bg-[#172554] px-6 py-12 text-center text-white sm:px-10 sm:py-14">
              <h2 id="cta-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Mulai langkah pertama Anda dalam BISINDO
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
                Pelajari materi secara bertahap, ulangi sesuai kebutuhan, dan
                simpan progres belajar dalam satu tempat.
              </p>
              <button
                type="button"
                className="landing-button landing-button-light mt-7"
                onClick={() => navigate("/register")}
              >
                Daftar Gratis
              </button>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
