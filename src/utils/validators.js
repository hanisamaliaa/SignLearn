/**
 * Shared validation helpers used across auth and profile forms.
 */

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isStrongPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

export function isRequired(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function initialsFromName(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
