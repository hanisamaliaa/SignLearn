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

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogv", ".mov", ".m4v"];
const YOUTUBE_HOSTS = [
  "youtu.be", "youtube.com", "m.youtube.com",
  "music.youtube.com", "youtube-nocookie.com",
];
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_PATH_PREFIXES = ["/embed/", "/shorts/", "/live/", "/v/"];

/**
 * Menguraikan URL media, atau `null` bila bukan http/https sama sekali.
 *
 * Protokol dibatasi secara eksplisit karena `new URL()` dengan senang hati
 * menerima `javascript:alert(1)`, dan nilai itu berakhir di atribut `src`.
 */
function parseMedia(value) {
  try {
    const parsed = new URL(String(value));
    return ["http:", "https:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

const hostOf = (url) => url.hostname.replace(/^www\./i, "").toLowerCase();
const hasExtension = (url, list) => {
  const path = url.pathname.toLowerCase();
  return list.some((extension) => path.endsWith(extension));
};

function youtubeVideoId(url) {
  const host = hostOf(url);
  if (!YOUTUBE_HOSTS.includes(host)) return null;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YOUTUBE_VIDEO_ID.test(id) ? id : null;
  }

  const queryId = url.searchParams.get("v");
  if (queryId && YOUTUBE_VIDEO_ID.test(queryId)) return queryId;

  for (const prefix of YOUTUBE_PATH_PREFIXES) {
    if (!url.pathname.startsWith(prefix)) continue;
    const id = url.pathname.slice(prefix.length).split("/")[0];
    return YOUTUBE_VIDEO_ID.test(id) ? id : null;
  }
  return null;
}

function tooLong(value, field, label) {
  return String(value).length > 500 ? [err(field, `${label} maksimal 500 karakter.`)] : [];
}

/**
 * URL gambar isyarat.
 *
 * Ekstensi gambar diwajibkan, dan itulah inti perbaikannya. Pemeriksaan lama
 * hanya menuntut http/https, sehingga tautan HALAMAN YouTube lolos ke kolom
 * gambar — persis yang terjadi pada satu-satunya baris di basis data, yang lalu
 * tampil sebagai gambar rusak tanpa petunjuk apa pun tentang sebabnya.
 *
 * Konsekuensinya URL CDN tanpa ekstensi ikut ditolak. Itu pilihan yang
 * disengaja: bank kata ini dikurasi dengan tangan, dan penolakan yang jelas
 * saat menyimpan jauh lebih murah daripada gambar rusak yang baru ketahuan
 * ketika seorang anak membukanya.
 */
function imageUrl(value, field, label) {
  if (blank(value)) return [];
  const url = parseMedia(value);
  if (!url) return [err(field, `${label} harus berupa URL http/https yang valid.`)];
  if (YOUTUBE_HOSTS.includes(hostOf(url))) {
    return [err(field, `${label} tidak boleh tautan YouTube — isi kolom video untuk itu.`)];
  }
  if (!hasExtension(url, IMAGE_EXTENSIONS)) {
    return [err(field, `${label} harus menunjuk berkas gambar (${IMAGE_EXTENSIONS.join(", ")}).`)];
  }
  return tooLong(value, field, label);
}

/**
 * URL video isyarat: berkas video langsung, atau tautan YouTube.
 *
 * YouTube diterima karena pemutarnya sudah ada sejak fitur kursus dan itulah
 * cara paling praktis menaruh video isyarat. Yang penting keduanya dibedakan,
 * supaya sisi tampilan tahu harus memakai `<video>` atau pemutar YouTube —
 * `<video src>` yang diarahkan ke halaman YouTube tidak pernah memutar apa pun.
 */
function videoUrl(value, field, label) {
  if (blank(value)) return [];
  const url = parseMedia(value);
  if (!url) return [err(field, `${label} harus berupa URL http/https yang valid.`)];
  if (YOUTUBE_HOSTS.includes(hostOf(url))) {
    if (!youtubeVideoId(url)) {
      return [err(field, `${label} harus menunjuk satu video YouTube yang valid, bukan kanal atau playlist.`)];
    }
    return tooLong(value, field, label);
  }
  if (hasExtension(url, VIDEO_EXTENSIONS)) return tooLong(value, field, label);
  return [err(field, `${label} harus berkas video (${VIDEO_EXTENSIONS.join(", ")}) atau tautan YouTube.`)];
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
    ...imageUrl(body.signImage, "signImage", "Gambar gerakan"),
    ...videoUrl(body.signVideo, "signVideo", "Video gerakan"),
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
  // Pencarian satu karakter DIIZINKAN. Sebelumnya ditolak untuk menghemat
  // beban, tetapi kamus ini isinya abjad: mencari "A" adalah hal paling wajar
  // yang dilakukan orang, dan menolaknya membuat fitur utamanya mustahil.
  if (query.q !== undefined && String(query.q).trim().length > 120) {
    errors.push(err("q", "Pencarian maksimal 120 karakter."));
  }
  if (query.status !== undefined && !STATUSES.includes(query.status)) errors.push(err("status", "Filter status tidak valid."));
  return errors;
}

export function validateLookup(_body, _params, query = {}) {
  return text(query.word, "word", "Kata", { required: true, min: 1, max: 140 });
}
