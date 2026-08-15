import { createContext, useCallback, useContext, useMemo } from "react";
import { useAccessibility } from "./AccessibilityContext";

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 22;
const ThemeContext = createContext(null);

/**
 * Compatibility facade for portal pages.
 *
 * Theme and accessibility used to be stored in two unrelated contexts. That
 * made the landing drawer and signed-in Settings page overwrite each other.
 * AccessibilityContext is now the sole persistent source of truth; this
 * facade preserves the existing Settings API without duplicating state.
 */
export function ThemeProvider({ children }) {
  const accessibility = useAccessibility();
  const fontSize = accessibility.textSize === "extra-large"
    ? 22
    : accessibility.textSize === "large" ? 19 : DEFAULT_FONT_SIZE;

  const setFontSize = useCallback((value) => {
    const size = Number(value);
    accessibility.setTextSize(size >= 21 ? "extra-large" : size >= 18 ? "large" : "normal");
  }, [accessibility]);

  const value = useMemo(() => ({
    theme: accessibility.theme,
    resolvedTheme: accessibility.theme,
    setTheme: accessibility.setTheme,
    fontSize,
    setFontSize,
    minFontSize: MIN_FONT_SIZE,
    maxFontSize: MAX_FONT_SIZE,
    highContrast: accessibility.highContrast,
    reducedMotion: accessibility.reduceMotion,
    setHighContrast: accessibility.setHighContrast,
    setReducedMotion: accessibility.setReduceMotion,
  }), [accessibility, fontSize, setFontSize]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
