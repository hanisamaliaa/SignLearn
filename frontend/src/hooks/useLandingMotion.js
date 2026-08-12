import { useEffect, useRef, useState } from "react";

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const updatePreference = () =>
      setReducedMotion(
        media.matches || root.classList.contains("kids-reduce-motion"),
      );
    const observer = new MutationObserver(updatePreference);
    updatePreference();
    media.addEventListener("change", updatePreference);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      media.removeEventListener("change", updatePreference);
      observer.disconnect();
    };
  }, []);

  return reducedMotion;
}

export function useInView({ rootMargin = "0px 0px -12%", threshold = 0.18 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
    const node = ref.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin, threshold]);

  return { ref, inView };
}

export function useCountUp(target, active, duration = 1100) {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!active || reducedMotion) {
      setValue(target);
      return;
    }

    let frameId;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(update);
    };
    setValue(0);
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [active, duration, reducedMotion, target]);

  return value;
}
