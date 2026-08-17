import crypto from "node:crypto";

/**
 * Primitif kriptografi untuk token opaque.
 *
 * Dipakai untuk refresh token dan token reset password — keduanya BUKAN JWT.
 * JWT membawa klaim yang dapat dibaca siapa pun dan tidak dapat dicabut;
 * untuk kredensial berumur panjang, token acak yang tercatat di database
 * adalah pilihan yang benar.
 */

/** Token acak aman-kriptografis, base64url (aman untuk cookie & URL). */
export function generateOpaqueToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * SHA-256 dari token, hex 64 karakter.
 *
 * Yang disimpan di database adalah hash ini, bukan tokennya. Dump database
 * yang bocor tidak memberi penyerang satu pun sesi yang dapat dipakai.
 *
 * SHA-256 cukup di sini — berbeda dengan password, token ini punya entropi
 * 384 bit dari CSPRNG, jadi tidak dapat ditebak lewat rainbow table dan
 * tidak memerlukan hashing lambat seperti bcrypt.
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Perbandingan waktu-konstan.
 *
 * `===` biasa keluar lebih awal pada byte pertama yang berbeda, sehingga
 * lama eksekusinya membocorkan berapa banyak karakter awal yang cocok.
 */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function randomUuid() {
  return crypto.randomUUID();
}

/** Panjang kode reset yang dikirim lewat email. */
export const RESET_CODE_LENGTH = 6;
export const EMAIL_VERIFICATION_CODE_LENGTH = 6;

/**
 * Kode reset enam digit.
 *
 * `crypto.randomInt` dipakai, bukan `Math.random`: yang terakhir bukan CSPRNG
 * dan keadaannya dapat dipulihkan dari beberapa keluaran, sehingga kode
 * berikutnya menjadi dapat diramalkan.
 *
 * Hasilnya diberi nol di depan. Tanpa itu satu dari sepuluh kode akan lebih
 * pendek, dan pengguna yang menerima "48291" akan mengira ada digit hilang.
 */
export function generateResetCode() {
  return String(crypto.randomInt(0, 10 ** RESET_CODE_LENGTH)).padStart(
    RESET_CODE_LENGTH,
    "0",
  );
}

/**
 * Hash kode yang TERIKAT pada pemiliknya.
 *
 * Kode enam digit hanya punya sejuta kemungkinan. Bila yang disimpan adalah
 * hash kode mentah, pencarian "cari baris dengan hash ini" akan cocok dengan
 * reset milik pengguna MANA SAJA yang sedang aktif — penyerang cukup menebak
 * angka tanpa perlu menargetkan siapa pun, dan peluangnya membesar seiring
 * banyaknya pengguna yang sedang mereset.
 *
 * Menyertakan `userId` di dalam hash membuat kode yang sama menghasilkan hash
 * berbeda untuk tiap pengguna, sehingga tebakan hanya berarti bila penyerang
 * sudah tahu email targetnya.
 */
export function hashResetCode(userId, code) {
  return hashToken(`${userId}:${String(code).trim()}`);
}

/** Kode verifikasi email memakai CSPRNG yang sama, tetapi domain hash berbeda. */
export function generateEmailVerificationCode() {
  return String(crypto.randomInt(0, 10 ** EMAIL_VERIFICATION_CODE_LENGTH)).padStart(
    EMAIL_VERIFICATION_CODE_LENGTH,
    "0",
  );
}

export function hashEmailVerificationCode(userId, code, pepper) {
  if (!pepper) throw new TypeError("Verification code pepper is required.");
  // Enam digit dapat di-brute-force dari dump database bila hanya memakai
  // SHA-256. HMAC membutuhkan secret aplikasi yang tidak tersimpan di DB,
  // sehingga token tetap terlindungi ketika hanya database yang bocor.
  return crypto
    .createHmac("sha256", pepper)
    .update(`email-verification:${userId}:${String(code).trim()}`)
    .digest("hex");
}
