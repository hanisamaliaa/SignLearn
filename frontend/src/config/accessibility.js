export const ACCESSIBILITY_STORAGE_KEY = "signlearn-accessibility-preferences";

export const TEXT_SIZE_OPTIONS = ["normal", "large", "extra-large"];

export const DEFAULT_ACCESSIBILITY_PREFERENCES = Object.freeze({
  textSize: "normal",
  highContrast: false,
  reduceMotion: false,
  theme: "light",
});

export function sanitizeAccessibilityPreferences(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }

  return {
    textSize: TEXT_SIZE_OPTIONS.includes(raw.textSize) ? raw.textSize : "normal",
    highContrast: raw.highContrast === true,
    reduceMotion: raw.reduceMotion === true,
    theme: raw.theme === "dark" ? "dark" : "light",
  };
}
