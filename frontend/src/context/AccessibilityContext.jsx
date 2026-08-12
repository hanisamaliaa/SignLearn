import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCESSIBILITY_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  sanitizeAccessibilityPreferences,
} from "../config/accessibility";
import { getItem, setItem } from "../utils/storage";

const AccessibilityContext = createContext(null);
let initialPreferences;

function readPreferences() {
  return sanitizeAccessibilityPreferences(getItem(ACCESSIBILITY_STORAGE_KEY));
}

function updateTextTracks(subtitles) {
  document.querySelectorAll("video").forEach((video) => {
    [...video.textTracks].forEach((track) => {
      if (track.kind === "captions" || track.kind === "subtitles") {
        track.mode = subtitles ? "showing" : "disabled";
      }
    });
  });
}

export function applyAccessibilityPreferences(preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-text-large", preferences.textSize === "large");
  root.classList.toggle("a11y-text-extra-large", preferences.textSize === "extra-large");
  root.classList.toggle("a11y-high-contrast", preferences.highContrast);
  root.classList.toggle("kids-reduce-motion", preferences.reduceMotion);
  root.classList.toggle("a11y-subtitles-hidden", !preferences.subtitles);
  root.classList.toggle("a11y-focus-mode", preferences.focusMode);
  root.dataset.accessibilityTextSize = preferences.textSize;
  if (preferences.highContrast) root.style.colorScheme = "light";
  else root.style.colorScheme = root.dataset.theme === "dark" ? "dark" : "light";
  updateTextTracks(preferences.subtitles);
}

export function initializeAccessibilityPreferences() {
  initialPreferences = readPreferences();
  applyAccessibilityPreferences(initialPreferences);
  return initialPreferences;
}

export function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState(
    () => initialPreferences ?? readPreferences(),
  );

  useLayoutEffect(() => {
    applyAccessibilityPreferences(preferences);
    setItem(ACCESSIBILITY_STORAGE_KEY, preferences);
  }, [preferences]);

  useEffect(() => {
    const observer = new MutationObserver(() => updateTextTracks(preferences.subtitles));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [preferences.subtitles]);

  const updatePreference = useCallback((key, value) => {
    setPreferences((current) => sanitizeAccessibilityPreferences({
      ...current,
      [key]: value,
    }));
  }, []);

  const resetAccessibility = useCallback(() => {
    setPreferences({ ...DEFAULT_ACCESSIBILITY_PREFERENCES });
  }, []);

  const value = useMemo(() => ({
    ...preferences,
    setTextSize: (textSize) => updatePreference("textSize", textSize),
    setHighContrast: (enabled) => updatePreference("highContrast", enabled),
    setReduceMotion: (enabled) => updatePreference("reduceMotion", enabled),
    setSubtitles: (enabled) => updatePreference("subtitles", enabled),
    setFocusMode: (enabled) => updatePreference("focusMode", enabled),
    resetAccessibility,
  }), [preferences, resetAccessibility, updatePreference]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}
