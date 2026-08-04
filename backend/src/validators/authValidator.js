/**
 * Auth validators. Return an array of error strings (empty = valid).
 */

export function validateRegister(body) {
  const errors = [];
  if (!body?.name || body.name.trim().length < 2) {
    errors.push("Nama lengkap minimal 2 karakter.");
  }
  if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push("Format email tidak valid.");
  }
  if (!body?.password || body.password.length < 6) {
    errors.push("Kata sandi minimal 6 karakter.");
  }
  return errors;
}

export function validateLogin(body) {
  const errors = [];
  if (!body?.email) errors.push("Email wajib diisi.");
  if (!body?.password) errors.push("Kata sandi wajib diisi.");
  return errors;
}
