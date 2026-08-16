/**
 * Membaca hasil operasi autentikasi dari `context/app`.
 *
 * ── Kenapa berkas ini ada ─────────────────────────────────────────────
 *
 * `login()` dan `register()` mengembalikan OBJEK, baik saat berhasil maupun
 * gagal: `{ success, message, code, errors }`. Halaman pendaftaran sempat
 * memeriksanya begini:
 *
 *     const ok = await register({ ... });
 *     if (!ok) { tampilkanGalat(); return; }
 *     setSuccess(true);
 *
 * `{ success: false }` adalah objek, dan objek selalu truthy — sehingga `!ok`
 * TIDAK PERNAH bernilai benar. Setiap pendaftaran yang ditolak server tetap
 * menampilkan "Pendaftaran berhasil", padahal tidak ada akun yang dibuat.
 * Pengguna baru menyadarinya ketika mencoba masuk dan selalu gagal.
 *
 * Memusatkan pembacaannya di sini membuat jebakan itu hanya bisa terjadi di
 * satu tempat, dan tempat itu punya pengujian.
 */

/** True bila operasi gagal. Menerima objek hasil, bukan nilai truthy apa pun. */
export function isAuthFailure(result) {
  return !result || result.success !== true;
}

/**
 * Pesan galat yang layak ditampilkan.
 *
 * Pesan dari server didahulukan karena ia yang tahu sebabnya: email sudah
 * terpakai, kata sandi tidak memenuhi kebijakan, atau terlalu banyak
 * percobaan. Menggantinya dengan satu kalimat tetap seperti "Email ini sudah
 * digunakan" akan menyesatkan pada dua kasus terakhir.
 */
export function authErrorMessage(result, fallback = "Terjadi kendala. Coba lagi sebentar, ya.") {
  if (!result) return fallback;

  const fieldMessage = Array.isArray(result.errors) && result.errors.length
    ? result.errors[0]?.message
    : null;

  return result.message || fieldMessage || fallback;
}

/** Galat per-kolom untuk ditandai langsung di formulir. */
export function authFieldErrors(result) {
  if (!Array.isArray(result?.errors)) return {};
  const map = {};
  for (const item of result.errors) {
    if (item?.field && item?.message && !map[item.field]) map[item.field] = item.message;
  }
  return map;
}
