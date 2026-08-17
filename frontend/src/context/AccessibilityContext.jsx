import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCESSIBILITY_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  sanitizeAccessibilityPreferences,
} from "../config/accessibility";

const AccessibilityContext = createContext(null);

function getItem(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors; accessibility preferences still work for the session.
  }
}

export function applyAccessibilityPreferences(preferences) {
  const root = document.documentElement;
  root.classList.toggle("a11y-text-large", preferences.textSize === "large");
  root.classList.toggle("a11y-text-extra-large", preferences.textSize === "extra-large");
  root.classList.toggle("a11y-high-contrast", preferences.highContrast);
  root.dataset.accessibilityTextSize = preferences.textSize;
  root.dataset.theme = preferences.theme;
  root.style.colorScheme = preferences.theme;
}

export function initializeAccessibilityPreferences() {
  const initialPreferences = sanitizeAccessibilityPreferences(getItem(ACCESSIBILITY_STORAGE_KEY));
  applyAccessibilityPreferences(initialPreferences);
  return initialPreferences;
}

export function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState(() =>
    sanitizeAccessibilityPreferences(getItem(ACCESSIBILITY_STORAGE_KEY)),
  );

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
    setItem(ACCESSIBILITY_STORAGE_KEY, preferences);
  }, [preferences]);

  const updatePreference = useCallback((key, value) => {
    setPreferences((current) =>
      sanitizeAccessibilityPreferences({ ...current, [key]: value }),
    );
  }, []);

  const resetAccessibility = useCallback(() => {
    setPreferences({ ...DEFAULT_ACCESSIBILITY_PREFERENCES });
  }, []);

  const value = useMemo(() => ({
    ...preferences,
    setTextSize: (textSize) => updatePreference("textSize", textSize),
    setHighContrast: (enabled) => updatePreference("highContrast", enabled),
    setReduceMotion: (enabled) => updatePreference("reduceMotion", enabled),
    setTheme: (theme) => updatePreference("theme", theme),
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
