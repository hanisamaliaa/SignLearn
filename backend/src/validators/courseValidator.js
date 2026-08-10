/**
 * Validator kursus.
 *
 * Mengembalikan `Array<{field, message}>` — sama seperti authValidator dan
 * lessonValidator. Bentuk lama yang mengembalikan array string tidak dapat
 * dipakai frontend untuk menyorot input yang bermasalah (API Contract §2.3).
 */

export const LEVELS = Object.freeze(["Pemula", "Menengah", "Lanjutan"]);

const err = (field, message) => ({ field, message });
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

function validateTitle(title, required) {
  if (isBlank(title)) {
    return required ? [err("title", "Judul kursus wajib diisi.")] : [];
  }
  const v = String(title).trim();
  if (v.length < 3) return [err("title", "Judul kursus minimal 3 karakter.")];
  if (v.length > 190) return [err("title", "Judul kursus maksimal 190 karakter.")];
  return [];
}

function validateLevel(level, required) {
  if (isBlank(level)) {
    return required ? [err("level", "Level kursus wajib diisi.")] : [];
  }
  if (!LEVELS.includes(level)) {
    return [err("level", `Level harus salah satu dari: ${LEVELS.join(", ")}.`)];
  }
  return [];
}

function validateText(value, field, max, label) {
  if (value === undefined || value === null) return [];
  if (typeof value !== "string") return [err(field, `${label} harus berupa teks.`)];
  if (value.length > max) return [err(field, `${label} maksimal ${max} karakter.`)];
  return [];
}

/**
 * Thumbnail harus http/https.
 *
 * Tanpa batasan skema, `javascript:` atau `data:` dapat tersimpan lalu
 * dirender frontend sebagai vektor XSS.
 */
function validateThumbnail(url) {
  if (isBlank(url)) return [];
  if (typeof url !== "string") return [err("thumbnail", "Thumbnail harus berupa teks.")];
  if (url.length > 500) return [err("thumbnail", "URL thumbnail maksimal 500 karakter.")];
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return [err("thumbnail", "URL thumbnail harus diawali http:// atau https://.")];
    }
  } catch {
    return [err("thumbnail", "Format URL thumbnail tidak valid.")];
  }
  return [];
}

function validateEstimatedHours(value) {
  if (value === undefined || value === null) return [];
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return [err("estimatedHours", "Estimasi jam harus angka tidak negatif.")];
  }
  // Kolom NUMERIC(4,1) — maksimum 999.9.
  if (n > 999.9) return [err("estimatedHours", "Estimasi jam maksimal 999,9.")];
  return [];
}

function validateSortOrder(value) {
  if (value === undefined || value === null) return [];
  if (!Number.isInteger(Number(value)) || Number(value) < 0) {
    return [err("sortOrder", "Urutan harus bilangan bulat tidak negatif.")];
  }
  if (Number(value) > 9999) return [err("sortOrder", "Urutan maksimal 9999.")];
  return [];
}

function validateBoolean(value, field, label) {
  if (value === undefined || value === null) return [];
  if (typeof value !== "boolean") {
    return [err(field, `${label} harus bernilai true atau false.`)];
  }
  return [];
}

/** POST — title & level wajib. */
export function validateCreateCourse(body = {}) {
  return [
    ...validateTitle(body.title, true),
    ...validateLevel(body.level, true),
    ...validateText(body.titleEn, "titleEn", 190, "Judul (Inggris)"),
    ...validateText(body.category, "category", 100, "Kategori"),
    ...validateText(body.description, "description", 5000, "Deskripsi"),
    ...validateThumbnail(body.thumbnail),
    ...validateEstimatedHours(body.estimatedHours),
    ...validateSortOrder(body.sortOrder),
    ...validateBoolean(body.isLocked, "isLocked", "isLocked"),
  ];
}

/**
 * PUT — seluruh field opsional (partial update).
 *
 * `totalLessons` sengaja TIDAK divalidasi maupun diterima: ia dihitung server
 * dari jumlah baris lessons. Menerimanya dari klien menciptakan dua sumber
 * kebenaran yang pasti akan menyimpang (API Contract §8.3).
 */
export function validateUpdateCourse(body = {}) {
  const errors = [
    ...validateTitle(body.title, false),
    ...validateLevel(body.level, false),
    ...validateText(body.titleEn, "titleEn", 190, "Judul (Inggris)"),
    ...validateText(body.category, "category", 100, "Kategori"),
    ...validateText(body.description, "description", 5000, "Deskripsi"),
    ...validateThumbnail(body.thumbnail),
    ...validateEstimatedHours(body.estimatedHours),
    ...validateSortOrder(body.sortOrder),
    ...validateBoolean(body.isLocked, "isLocked", "isLocked"),
  ];

  const updatable = [
    "title", "titleEn", "category", "level", "description",
    "thumbnail", "estimatedHours", "sortOrder", "isLocked",
  ];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  if (body.totalLessons !== undefined) {
    errors.push(err("totalLessons", "totalLessons dihitung otomatis dan tidak dapat diubah."));
  }

  return errors;
}

/** Validasi query string untuk listing. */
export function validateCourseQuery(_body, _params, query = {}) {
  const errors = [];
  const SORTABLE = ["sortOrder", "title", "createdAt", "level"];

  if (query.level !== undefined && !LEVELS.includes(query.level)) {
    errors.push(err("level", `Filter level harus salah satu dari: ${LEVELS.join(", ")}.`));
  }
  if (query.sortBy !== undefined && !SORTABLE.includes(query.sortBy)) {
    errors.push(err("sortBy", `sortBy harus salah satu dari: ${SORTABLE.join(", ")}.`));
  }
  if (query.sortDir !== undefined && !["asc", "desc"].includes(String(query.sortDir).toLowerCase())) {
    errors.push(err("sortDir", "sortDir harus 'asc' atau 'desc'."));
  }
  if (query.q !== undefined && String(query.q).trim().length === 1) {
    errors.push(err("q", "Kata kunci pencarian minimal 2 karakter."));
  }

  return errors;
}
