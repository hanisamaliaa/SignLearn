/**
 * User validators. Return an array of error strings (empty = valid).
 */

export function validateUpdateProfile(body) {
  const errors = [];
  if (body?.name !== undefined && body.name.trim().length < 2) {
    errors.push("Nama lengkap minimal 2 karakter.");
  }
  if (
    body?.email !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
  ) {
    errors.push("Format email tidak valid.");
  }
  return errors;
}

export function validateCreateUser(body) {
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
