/**
 * Penguraian URL YouTube.
 *
 * Dipisahkan dari komponen player karena inilah bagian yang paling mudah
 * salah: URL yang sama ditulis dalam lima bentuk berbeda, dan sebuah id yang
 * gagal diurai membuat pelajaran tampil kosong tanpa pesan apa pun. Sebagai
 * fungsi murni ia dapat diuji tanpa DOM maupun jaringan.
 */

// Id video YouTube selalu 11 karakter dari alfabet URL-safe.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const PATH_PREFIXES = ["/embed/", "/shorts/", "/live/", "/v/"];

/**
 * @param {string} value URL penuh, atau id video langsung.
 * @returns {string|null} id video, atau null bila tidak dapat dikenali.
 */
export function parseYouTubeId(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (VIDEO_ID.test(trimmed)) return trimmed;

  let url;
  try {
    // URL tanpa skema tetap diterima; admin biasa menempel "youtu.be/xxx".
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const isYouTube =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com";
  if (!isYouTube) return null;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return VIDEO_ID.test(id) ? id : null;
  }

  const queryId = url.searchParams.get("v");
  if (queryId && VIDEO_ID.test(queryId)) return queryId;

  for (const prefix of PATH_PREFIXES) {
    if (url.pathname.startsWith(prefix)) {
      const id = url.pathname.slice(prefix.length).split("/")[0];
      return VIDEO_ID.test(id) ? id : null;
    }
  }

  return null;
}

/**
 * Sampul video.
 *
 * `maxresdefault` tidak ada untuk setiap video — YouTube hanya membuatnya bila
 * sumbernya cukup besar — sehingga pemanggil wajib menyiapkan `fallback` untuk
 * dipakai saat gambar gagal dimuat. `hqdefault` selalu ada.
 */
export function thumbnailUrl(videoId, quality = "maxresdefault") {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Urutan kualitas thumbnail dari yang paling tinggi ke fallback terakhir.
 * Digunakan oleh player untuk mencoba satu per satu sampai gambar berhasil
 * dimuat.
 */
export const THUMBNAIL_QUALITY_CHAIN = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
];

export const FALLBACK_THUMBNAIL_QUALITY = "hqdefault";

/** Tautan tonton untuk jalur mundur saat player menolak memutar. */
export function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Durasi detik menjadi "m:ss" atau "h:mm:ss"; player melaporkan pecahan. */
export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}
