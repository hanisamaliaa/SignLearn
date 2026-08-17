import { validatePassword } from "./passwordPolicy.js";

/**
 * Validator auth.
 *
 * Kontrak: setiap validator mengembalikan `Array<{field, message}>`.
 * Array kosong berarti valid.
 *
 * Bentuk per-field ini yang memungkinkan frontend menyorot input yang
 * bermasalah, bukan menumpuk semua pesan di satu tempat (API Contract §2.3).
 */

const PROFILES = new Set(["parent", "deaf", "general"]);

// Sengaja longgar. Regex email yang "benar" secara RFC 5322 panjangnya ratusan
// karakter dan tetap menolak alamat yang sah. Verifikasi sesungguhnya dilakukan
// dengan mengirim email, bukan dengan regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const err = (field, message) => ({ field, message });

function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return [err("email", "Email wajib diisi.")];
  }
  const value = email.trim();
  if (value.length > 190) {
    return [err("email", "Email maksimal 190 karakter.")];
  }
  if (!EMAIL_RE.test(value)) {
    return [err("email", "Format email tidak valid.")];
  }
  return [];
}

function validateName(name) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return [err("name", "Nama lengkap wajib diisi.")];
  }
  const value = name.trim();
  if (value.length < 2) return [err("name", "Nama lengkap minimal 2 karakter.")];
  if (value.length > 120) return [err("name", "Nama lengkap maksimal 120 karakter.")];
  return [];
}

export function validateRegister(body = {}) {
  const errors = [
    ...validateName(body.name),
    ...validateEmail(body.email),
    // Konteks diteruskan agar kebijakan dapat menolak kata sandi yang
    // memuat nama atau email pengguna sendiri.
    ...validatePassword(body.password, { email: body.email, name: body.name }),
  ];

  if (body.profile !== undefined && !PROFILES.has(body.profile)) {
    errors.push(err("profile", `Profil harus salah satu dari: ${[...PROFILES].join(", ")}.`));
  }

  return errors;
}

export function validateLogin(body = {}) {
  const errors = [];

  // Login TIDAK memakai kebijakan kata sandi. Akun lama boleh saja punya
  // sandi yang tidak memenuhi aturan sekarang; menolaknya di login akan
  // mengunci mereka keluar tanpa jalan masuk kembali.
  if (!body.email || !String(body.email).trim()) {
    errors.push(err("email", "Email wajib diisi."));
  }
  if (!body.password) {
    errors.push(err("password", "Kata sandi wajib diisi."));
  }

  return errors;
}

export function validateForgotPassword(body = {}) {
  return validateEmail(body.email);
}

export function validateResetPassword(body = {}) {
  const errors = [];

  // Email wajib: kode enam digit hanya dapat dicari dengan aman bila terikat
  // ke satu pengguna. Tanpa email, pencarian lewat kode saja akan cocok dengan
  // reset milik pengguna mana pun yang sedang aktif.
  if (!body.email || !String(body.email).trim()) {
    errors.push(err("email", "Email wajib diisi."));
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    errors.push(err("code", "Kode reset wajib diisi."));
  } else if (!/^[0-9]{6}$/.test(code)) {
    errors.push(err("code", "Kode reset terdiri dari 6 angka."));
  }

  errors.push(...validatePassword(body.password));

  return errors;
}

export function validateChangePassword(body = {}) {
  const errors = [];

  if (!body.currentPassword) {
    errors.push(err("currentPassword", "Kata sandi saat ini wajib diisi."));
  }
  errors.push(
    ...validatePassword(body.newPassword).map((e) => ({ ...e, field: "newPassword" })),
  );
  if (body.currentPassword && body.newPassword && body.currentPassword === body.newPassword) {
    errors.push(err("newPassword", "Kata sandi baru harus berbeda dari kata sandi saat ini."));
  }

  return errors;
}
