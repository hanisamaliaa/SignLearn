/**
 * Safe localStorage helpers (guards against SSR / private browsing).
 */

function isAvailable() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function getItem(key) {
  try {
    if (!isAvailable()) return null;
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    if (!isAvailable()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy errors
  }
}

export function removeItem(key) {
  try {
    if (!isAvailable()) return;
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
