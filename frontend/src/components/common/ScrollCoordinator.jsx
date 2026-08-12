import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getLandingSectionId } from "../../config/landingNavigation";

function jumpToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export default function ScrollCoordinator() {
  const location = useLocation();
  const previousPathRef = useRef(null);

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
      target.scrollIntoView({ behavior: "instant", block: "start" });
      return undefined;
    }

    jumpToTop();
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, location.key, location.state]);

  return null;
}
