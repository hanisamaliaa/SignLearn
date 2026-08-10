/**
 * Validator lesson.
 *
 * Kontrak sama dengan authValidator: mengembalikan `Array<{field, message}>`,
 * array kosong berarti valid. Bentuk per-field ini yang memungkinkan frontend
 * menyorot input yang bermasalah (API Contract §2.3).
 */

const err = (field, message) => ({ field, message });

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

/** ID dari path/body harus bilangan bulat positif. */
function validateId(value, field) {
  if (isBlank(value)) return [err(field, `${field} wajib diisi.`)];
  if (!/^\d+$/.test(String(value))) {
    return [err(field, `${field} harus berupa angka.`)];
  }
  return [];
}

function validateTitle(title, required) {
  if (isBlank(title)) {
    return required ? [err("title", "Judul pelajaran wajib diisi.")] : [];
  }
  const v = String(title).trim();
  if (v.length < 3) return [err("title", "Judul pelajaran minimal 3 karakter.")];
  if (v.length > 190) return [err("title", "Judul pelajaran maksimal 190 karakter.")];
  return [];
}

function validateOptionalString(value, field, max, label) {
  if (value === undefined || value === null) return [];
  if (typeof value !== "string") return [err(field, `${label} harus berupa teks.`)];
  if (value.length > max) return [err(field, `${label} maksimal ${max} karakter.`)];
  return [];
}

function validateVideoUrl(url) {
  if (url === undefined || url === null || url === "") return [];
  if (typeof url !== "string") return [err("videoUrl", "URL video harus berupa teks.")];
  if (url.length > 500) return [err("videoUrl", "URL video maksimal 500 karakter.")];

  // Hanya http/https. Tanpa batasan ini, `javascript:` atau `data:` dapat
  // tersimpan lalu dirender frontend sebagai vektor XSS.
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return [err("videoUrl", "URL video harus diawali http:// atau https://.")];
    }
  } catch {
    return [err("videoUrl", "Format URL video tidak valid.")];
  }
  return [];
}

function validateSortOrder(value) {
  if (value === undefined || value === null) return [];
  if (!Number.isInteger(Number(value)) || Number(value) < 0) {
    return [err("sortOrder", "Urutan harus bilangan bulat tidak negatif.")];
  }
  if (Number(value) > 9999) {
    return [err("sortOrder", "Urutan maksimal 9999.")];
  }
  return [];
}

function validateIsLocked(value) {
  if (value === undefined || value === null) return [];
  if (typeof value !== "boolean") {
    return [err("isLocked", "isLocked harus bernilai true atau false.")];
  }
  return [];
}

/** POST — courseId & title wajib. */
export function validateCreateLesson(body = {}, params = {}) {
  // courseId boleh datang dari path (rute bersarang) atau body (rute datar).
  const courseId = params.courseId ?? body.courseId;

  return [
    ...validateId(courseId, "courseId"),
    ...validateTitle(body.title, true),
    ...validateOptionalString(body.description, "description", 5000, "Deskripsi"),
    ...validateOptionalString(body.duration, "duration", 30, "Durasi"),
    ...validateVideoUrl(body.videoUrl),
    ...validateSortOrder(body.sortOrder),
    ...validateIsLocked(body.isLocked),
  ];
}

/**
 * PUT/PATCH — seluruh field opsional (partial update).
 *
 * Yang tidak dikirim TIDAK diubah. Ini berbeda dari perilaku sebelumnya yang
 * menimpa seluruh kolom, sehingga mengirim `{title}` saja menghapus deskripsi
 * dan URL video secara diam-diam.
 */
export function validateUpdateLesson(body = {}) {
  const errors = [
    ...validateTitle(body.title, false),
    ...validateOptionalString(body.description, "description", 5000, "Deskripsi"),
    ...validateOptionalString(body.duration, "duration", 30, "Durasi"),
    ...validateVideoUrl(body.videoUrl),
    ...validateSortOrder(body.sortOrder),
    ...validateIsLocked(body.isLocked),
  ];

  if (body.courseId !== undefined) {
    errors.push(...validateId(body.courseId, "courseId"));
  }

  const updatable = [
    "title", "description", "duration", "videoUrl",
    "sortOrder", "isLocked", "courseId",
  ];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  return errors;
}

/** PATCH .../reorder — daftar id lengkap dalam urutan baru. */
export function validateReorderLessons(body = {}) {
  if (!Array.isArray(body.order)) {
    return [err("order", "order harus berupa array berisi id pelajaran.")];
  }
  if (body.order.length === 0) {
    return [err("order", "order tidak boleh kosong.")];
  }
  if (body.order.some((id) => !/^\d+$/.test(String(id)))) {
    return [err("order", "Seluruh id pada order harus berupa angka.")];
  }
  if (new Set(body.order.map(String)).size !== body.order.length) {
    return [err("order", "Terdapat id yang duplikat pada order.")];
  }
  return [];
}
