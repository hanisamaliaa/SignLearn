import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "./useLandingMotion";

/**
 * Lightweight pointer motion for premium hover surfaces.
 *
 * Values are written directly to CSS custom properties inside one animation
 * frame, so pointer movement never triggers a React render. The interaction is
 * automatically disabled for touch/coarse pointers and reduced-motion users.
 */
export function usePointerMotion({ maxShift = 0, maxRotate = 0 } = {}) {
  const ref = useRef(null);
  const rectRef = useRef(null);
  const frameRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const canAnimate = useCallback(
    () =>
      !reducedMotion &&
      typeof window !== "undefined" &&
      window.innerWidth > 900 &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    [reducedMotion],
  );

  const reset = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    rectRef.current = null;
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--motion-x", "0px");
    node.style.setProperty("--motion-y", "0px");
    node.style.setProperty("--motion-rx", "0deg");
    node.style.setProperty("--motion-ry", "0deg");
    node.style.setProperty("--pointer-x", "50%");
    node.style.setProperty("--pointer-y", "50%");
    node.removeAttribute("data-pointer-active");
  }, []);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!canAnimate()) reset();
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [canAnimate, reset]);

  const onPointerEnter = useCallback(
    (event) => {
      if (!canAnimate()) return;
      rectRef.current = event.currentTarget.getBoundingClientRect();
      event.currentTarget.setAttribute("data-pointer-active", "true");
    },
    [canAnimate],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!canAnimate()) return;
      const node = event.currentTarget;
      const rect = rectRef.current ?? node.getBoundingClientRect();
      const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        node.style.setProperty("--motion-x", `${normalizedX * maxShift}px`);
        node.style.setProperty("--motion-y", `${normalizedY * maxShift}px`);
        node.style.setProperty("--motion-rx", `${normalizedY * -maxRotate}deg`);
        node.style.setProperty("--motion-ry", `${normalizedX * maxRotate}deg`);
        node.style.setProperty("--pointer-x", `${(normalizedX + 1) * 50}%`);
        node.style.setProperty("--pointer-y", `${(normalizedY + 1) * 50}%`);
      });
    },
    [canAnimate, maxRotate, maxShift],
  );

  return {
    ref,
    pointerProps: {
      onPointerEnter,
      onPointerMove,
      onPointerLeave: reset,
      onBlur: reset,
    },
  };
}
