/**
 * Validator pengguna & profil — API Contract §7.
 *
 * Mengembalikan `Array<{field, message}>`; array kosong berarti valid. Bentuk
 * ini yang dituntut `validate.middleware.js` dan yang memungkinkan frontend
 * menyorot input yang salah (API Contract §2.3).
 *
 * ── Kenapa setiap fungsi memeriksa TIPE lebih dulu ────────────────────
 *
 * Versi sebelumnya menulis `body.name.trim().length < 2`. Mengirim
 * `{"name": 12345}` membuat `.trim` tidak ada, melempar TypeError, dan
 * pengguna menerima 500 — padahal ini murni kesalahan input yang seharusnya
 * dijawab 422. Klien yang salah tidak boleh terlihat seperti server yang rusak.
 */

export const PROFILES = Object.freeze(["parent", "deaf", "general"]);
export const STATUSES = Object.freeze(["active", "inactive", "suspended"]);
export const ROLES = Object.freeze(["user", "admin"]);
export const USER_SORTABLE = Object.freeze(["name", "email", "joinDate", "createdAt"]);

const err = (field, message) => ({ field, message });

/**
 * Panjang maksimum mengikuti lebar kolom di `schema.sql`.
 *
 * Tanpa batas di sini, nilai yang terlalu panjang lolos ke PostgreSQL dan
 * ditolak dengan SQLSTATE 22001 — yang sampai ke pengguna sebagai 500.
 * Batas kolom adalah soal integritas; batas di sini adalah soal pesan error
 * yang bisa dimengerti.
 */
const MAX = Object.freeze({ name: 120, phone: 30, avatar: 500 });

/**
 * Memvalidasi field teks opsional.
 *
 * `null` diterima sebagai "kosongkan field ini" — berbeda dari `undefined`
 * yang berarti "jangan sentuh field ini".
 */
function optionalText(value, field, max, label) {
  if (value === undefined || value === null) return [];
  if (typeof value !== "string") return [err(field, `${label} harus berupa teks.`)];
  if (value.length > max) return [err(field, `${label} maksimal ${max} karakter.`)];
  return [];
}

function optionalName(value) {
  if (value === undefined) return [];
  if (typeof value !== "string") return [err("name", "Nama lengkap harus berupa teks.")];

  const trimmed = value.trim();
  if (trimmed.length < 2) return [err("name", "Nama lengkap minimal 2 karakter.")];
  if (trimmed.length > MAX.name) {
    return [err("name", `Nama lengkap maksimal ${MAX.name} karakter.`)];
  }
  return [];
}

function optionalAvatar(value) {
  const errors = optionalText(value, "avatar", MAX.avatar, "Avatar");
  if (errors.length || value === undefined || value === null) return errors;
  if (/^[a-zA-Z0-9_-]{1,20}$/.test(value)) return [];

  try {
    const url = new URL(value);
    if (url.protocol === "https:") return [];
  } catch {
    // Ditangani oleh pesan validasi tunggal di bawah.
  }
  return [err("avatar", "Avatar harus berupa pilihan bawaan atau URL HTTPS yang valid.")];
}

function optionalEnum(value, field, allowed, label) {
  if (value === undefined) return [];
  if (!allowed.includes(value)) {
    return [err(field, `${label} harus salah satu dari: ${allowed.join(", ")}.`)];
  }
  return [];
}

/**
 * PUT /users/profile — §7.2.
 *
 * `email`, `role`, dan `status` sengaja TIDAK ditolak: kontrak menyebut
 * ketiganya diabaikan diam-diam. Menolaknya akan memecahkan klien lama yang
 * mengirim ulang seluruh objek user hasil GET sebelumnya — pola yang sangat
 * umum di form React.
 *
 * Yang mencegah eskalasi peran bukan validator ini, melainkan allowlist kolom
 * di `userRepository.updateProfile`. Validator menjaga bentuk; repository
 * menjaga kewenangan.
 */
export function validateUpdateProfile(body = {}) {
  const errors = [
    ...optionalName(body.name),
    ...optionalText(body.phone, "phone", MAX.phone, "Nomor telepon"),
    ...optionalAvatar(body.avatar),
    ...optionalEnum(body.profile, "profile", PROFILES, "Profil"),
  ];

  const updatable = ["name", "phone", "avatar", "profile"];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  return errors;
}

/**
 * PUT /users/:id — §7.5, khusus admin.
 *
 * Berbeda dari profil sendiri, di sini `role` dan `status` MEMANG boleh diubah.
 *
 * `email` dan `password` ditolak terang-terangan, bukan diabaikan. Alasannya
 * berkebalikan dengan §7.2: ini panel admin, dan admin yang mengira baru saja
 * mengganti kata sandi seseorang padahal tidak terjadi apa-apa adalah kegagalan
 * yang jauh lebih berbahaya daripada form yang menolak satu field.
 */
export function validateAdminUpdateUser(body = {}) {
  const errors = [
    ...optionalName(body.name),
    ...optionalText(body.phone, "phone", MAX.phone, "Nomor telepon"),
    ...optionalAvatar(body.avatar),
    ...optionalEnum(body.profile, "profile", PROFILES, "Profil"),
    ...optionalEnum(body.role, "role", ROLES, "Peran"),
    ...optionalEnum(body.status, "status", STATUSES, "Status"),
  ];

  if (body.email !== undefined) {
    errors.push(err("email", "Email tidak dapat diubah lewat endpoint ini."));
  }
  if (body.password !== undefined) {
    errors.push(err(
      "password",
      "Kata sandi tidak dapat diubah lewat endpoint ini. Pengguna harus memakai alur lupa kata sandi.",
    ));
  }

  const updatable = ["name", "phone", "avatar", "profile", "role", "status"];
  if (errors.length === 0 && !updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  return errors;
}

/** Query listing pengguna — §7.3. */
export function validateUserQuery(_body, _params, query = {}) {
  const errors = [];

  if (query.role !== undefined && !ROLES.includes(query.role)) {
    errors.push(err("role", `Filter role harus salah satu dari: ${ROLES.join(", ")}.`));
  }
  if (query.status !== undefined && !STATUSES.includes(query.status)) {
    errors.push(err("status", `Filter status harus salah satu dari: ${STATUSES.join(", ")}.`));
  }
  if (query.sortBy !== undefined && !USER_SORTABLE.includes(query.sortBy)) {
    errors.push(err("sortBy", `sortBy harus salah satu dari: ${USER_SORTABLE.join(", ")}.`));
  }
  if (
    query.sortDir !== undefined &&
    !["asc", "desc"].includes(String(query.sortDir).toLowerCase())
  ) {
    errors.push(err("sortDir", "sortDir harus 'asc' atau 'desc'."));
  }
  if (query.q !== undefined && String(query.q).trim().length === 1) {
    errors.push(err("q", "Kata kunci pencarian minimal 2 karakter."));
  }

  return errors;
}
