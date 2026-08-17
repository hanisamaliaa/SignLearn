const STORAGE_PREFIX = "signlearn:profile-photo:";

function getUserKey(user) {
  return String(user?.id ?? user?.userId ?? user?.email ?? "").trim();
}

function getStorageKey(user) {
  const key = getUserKey(user);
  return key ? `${STORAGE_PREFIX}${key}` : null;
}

export function getStoredProfilePhoto(user) {
  try {
    if (typeof window === "undefined") return null;
    const storageKey = getStorageKey(user);
    return storageKey ? window.localStorage.getItem(storageKey) : null;
  } catch {
    return null;
  }
}

export function saveStoredProfilePhoto(user, dataUrl) {
  try {
    if (typeof window === "undefined") return false;
    const storageKey = getStorageKey(user);
    if (!storageKey || !dataUrl) return false;
    window.localStorage.setItem(storageKey, dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function removeStoredProfilePhoto(user) {
  try {
    if (typeof window === "undefined") return;
    const storageKey = getStorageKey(user);
    if (storageKey) window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors.
  }
}
