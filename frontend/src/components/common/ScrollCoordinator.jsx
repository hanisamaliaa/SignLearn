import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getLandingSectionId } from "../../config/landingNavigation";
import { useReducedMotion } from "../../hooks/useLandingMotion";

function jumpToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.querySelectorAll("[data-route-scroll-container]").forEach((container) => {
    container.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

export default function ScrollCoordinator() {
  const location = useLocation();
  const previousPathRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;
    const sectionId = location.pathname === "/" ? getLandingSectionId(location.hash) : null;
    const target = sectionId ? document.getElementById(sectionId) : null;

    if (!target) {
      jumpToTop();
      return undefined;
    }

    const handledBySamePageNavigation = previousPath === location.pathname
      && location.state?.samePageSection === sectionId;
    if (handledBySamePageNavigation) return undefined;

    const crossRouteNavigation = location.state?.scrollToSection === sectionId;
    if (!crossRouteNavigation) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      return undefined;
    }

    jumpToTop();
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, location.key, location.state, reducedMotion]);

  return null;
}
