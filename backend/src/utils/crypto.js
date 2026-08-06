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
