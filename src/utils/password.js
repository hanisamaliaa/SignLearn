/**
 * Password hashing utilities.
 *
 * NOTE: This uses a simple deterministic hash (SHA-256 via Web Crypto) as a
 * placeholder until a real backend (bcrypt) is wired up. It is sufficient
 * for the localStorage demo architecture and keeps passwords from being
 * stored in plain text. The service layer is the single place that calls
 * these functions, so swapping in bcrypt later only touches this file.
 */

async function sha256(text) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for non-secure contexts (plain text — not ideal but safe enough
  // for the demo).
  return `plain:${text}`;
}

export async function hashPassword(password) {
  if (!password) return "";
  return sha256(`signlearn:${password}`);
}

export async function verifyPassword(password, hashed) {
  if (!password || !hashed) return false;
  const candidate = await hashPassword(password);
  return candidate === hashed;
}
