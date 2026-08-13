const err = (field, message) => ({ field, message });
const blank = (value) => value == null || String(value).trim() === "";
const STATUSES = ["active", "inactive"];

function text(value, field, label, { required = false, min = 0, max = 5000 } = {}) {
  if (blank(value)) return required ? [err(field, `${label} wajib diisi.`)] : [];
  if (typeof value !== "string") return [err(field, `${label} harus berupa teks.`)];
  const length = value.trim().length;
  if (length < min) return [err(field, `${label} minimal ${min} karakter.`)];
  if (length > max) return [err(field, `${label} maksimal ${max} karakter.`)];
  return [];
}

function mediaUrl(value, field, label) {
  if (blank(value)) return [];
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return [err(field, `${label} harus berupa URL http/https yang valid.`)];
  }
  return String(value).length > 500 ? [err(field, `${label} maksimal 500 karakter.`)] : [];
}

function aliases(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    return [err("aliases", "Alias harus berupa daftar teks yang tidak kosong.")];
  }
  if (value.length > 20) return [err("aliases", "Alias maksimal 20 kata.")];
  return [];
}

function fields(body, required) {
  const errors = [
    ...text(body.word, "word", "Kata", { required, min: 2, max: 120 }),
    ...text(body.translation, "translation", "Representasi BISINDO", { required, min: 1, max: 240 }),
    ...text(body.description, "description", "Deskripsi", { max: 2000 }),
    ...text(body.category, "category", "Kategori", { max: 100 }),
    ...mediaUrl(body.signImage, "signImage", "Gambar gerakan"),
    ...mediaUrl(body.signVideo, "signVideo", "Video gerakan"),
    ...aliases(body.aliases),
  ];
  if (body.status !== undefined && !STATUSES.includes(body.status)) errors.push(err("status", "Status harus active atau inactive."));
  return errors;
}

export const validateCreateTranslation = (body = {}) => fields(body, true);
export function validateUpdateTranslation(body = {}) {
  const errors = fields(body, false);
  const allowed = ["word", "translation", "description", "category", "status", "signImage", "signVideo", "aliases"];
  if (!allowed.some((key) => body[key] !== undefined)) errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  return errors;
}

export function validateTranslationQuery(_body, _params, query = {}) {
  const errors = [];
  if (query.q !== undefined && String(query.q).trim().length === 1) errors.push(err("q", "Pencarian minimal 2 karakter."));
  if (query.status !== undefined && !STATUSES.includes(query.status)) errors.push(err("status", "Filter status tidak valid."));
  return errors;
}

export function validateLookup(_body, _params, query = {}) {
  return text(query.word, "word", "Kata", { required: true, min: 1, max: 140 });
}
