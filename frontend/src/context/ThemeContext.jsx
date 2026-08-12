import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useApp } from "./app";

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 22;

const ThemeContext = createContext(null);

function getSystemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(theme) {
  if (theme === "system") return getSystemPrefersDark() ? "dark" : "light";
  return theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const { currentUser, updateUserSettings } = useApp();

  // Per-user theme + fontSize from the user's settings object.
  const userSettings = currentUser?.settings || {};
  const theme = userSettings.theme || "system";
  const fontSize = userSettings.fontSize ?? DEFAULT_FONT_SIZE;
  const accessibility = userSettings.accessibility || {};
  const highContrast = Boolean(accessibility.highContrast);
  const reducedMotion = Boolean(accessibility.reducedMotion);

  // Synced local state so the OS "system" listener can reflect live changes.
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(theme));

  // Update resolved theme when the selected mode changes.
  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));
  }, [theme]);

  // Live-update when the OS preference changes (only relevant for "system").
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e) => {
      if (theme === "system") {
        setResolvedTheme(e.matches ? "dark" : "light");
      }
    };
    mql.addEventListener?.("change", listener);
    return () => mql.removeEventListener?.("change", listener);
  }, [theme]);

  // Apply the resolved theme as a data attribute on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    if (!root.classList.contains("a11y-high-contrast")) {
      root.style.colorScheme = resolvedTheme;
    }
  }, [resolvedTheme]);

  // Apply the global font size to the root element.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-font-size",
      `${fontSize}px`,
    );
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-high-contrast", highContrast);
    root.toggleAttribute("data-reduced-motion", reducedMotion);
  }, [highContrast, reducedMotion]);

  const setThemeValue = useCallback(
    (value) => {
      if (value === "light" || value === "dark" || value === "system") {
        updateUserSettings({ ...currentUser?.settings, theme: value });
      }
    },
    [currentUser, updateUserSettings],
  );

  const setFontSizeValue = useCallback(
    (value) => {
      const num = parseInt(value, 10);
      if (Number.isNaN(num)) return;
      const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, num));
      updateUserSettings({ ...currentUser?.settings, fontSize: clamped });
    },
    [currentUser, updateUserSettings],
  );

  const setAccessibilityValue = useCallback(
    (key, value) => {
      updateUserSettings({
        ...currentUser?.settings,
        accessibility: {
          ...currentUser?.settings?.accessibility,
          [key]: Boolean(value),
        },
      });
    },
    [currentUser, updateUserSettings],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeValue,
      resolvedTheme,
      fontSize,
      setFontSize: setFontSizeValue,
      minFontSize: MIN_FONT_SIZE,
      maxFontSize: MAX_FONT_SIZE,
      highContrast,
      reducedMotion,
      setHighContrast: (value) => setAccessibilityValue("highContrast", value),
      setReducedMotion: (value) => setAccessibilityValue("reducedMotion", value),
    }),
    [
      theme,
      setThemeValue,
      resolvedTheme,
      fontSize,
      setFontSizeValue,
      highContrast,
      reducedMotion,
      setAccessibilityValue,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
