import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "./useLandingMotion";

export default function useLandingNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const navigateToLandingSection = useCallback((event, destination) => {
    event?.preventDefault();

    if (destination.kind !== "landing-section") return;

    const target = location.pathname === "/"
      ? document.getElementById(destination.id)
      : null;

    if (!target) {
      navigate(destination.href, {
        state: { scrollToSection: destination.id },
      });
      return;
    }

    navigate(destination.href, {
      replace: location.hash === destination.hash,
      state: { samePageSection: destination.id },
    });
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [location.hash, location.pathname, navigate, reducedMotion]);

  const scrollCurrentPageToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [reducedMotion]);

  return { navigateToLandingSection, scrollCurrentPageToTop };
}
