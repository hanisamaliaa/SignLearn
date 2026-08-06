/**
 * Kebijakan kata sandi.
 *
 * Pure function — tanpa I/O, tanpa dependensi. Dapat diuji tanpa database
 * dan dipakai ulang di endpoint register maupun reset password.
 *
 * Mengembalikan array error per field, BUKAN melempar, agar seluruh masalah
 * dapat ditampilkan sekaligus. Meminta pengguna memperbaiki satu aturan,
 * submit, lalu menemukan aturan berikutnya adalah pengalaman yang buruk.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt hanya membaca 72 byte pertama dan MEMBUANG sisanya secara diam-diam.
 *
 * Tanpa batas eksplisit, kata sandi 100 karakter dan 72 karakter pertamanya
 * akan cocok satu sama lain — pengguna mengira sandinya lebih kuat daripada
 * kenyataannya. Batas ini membuat pemotongan menjadi penolakan yang terlihat.
 */
export const PASSWORD_MAX_LENGTH = 72;

const MAX_REPEAT_RUN = 3; // "aaa" boleh, "aaaa" tidak
const MIN_SEQUENCE_RUN = 4; // "abcd", "1234" ditolak

/** Kata sandi yang paling sering muncul di kebocoran data. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "qwerty123",
  "12345678", "123456789", "1234567890", "11111111", "00000000",
  "abcd1234", "admin123", "welcome1", "iloveyou", "sunshine",
  "princess", "football", "baseball", "superman", "trustno1",
  "letmein1", "monkey12", "dragon12", "master12", "shadow12",
  "qwertyui", "asdfghjk", "zxcvbnm1", "1q2w3e4r", "1qaz2wsx",
  // Umum di Indonesia
  "indonesia", "bismillah", "sayangku", "rahasia1", "kucing123",
]);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

const err = (message) => ({ field: "password", message });

/** Apakah ada karakter sama berulang lebih dari MAX_REPEAT_RUN kali? */
function hasRepeatRun(value) {
  let run = 1;
  for (let i = 1; i < value.length; i++) {
    run = value[i] === value[i - 1] ? run + 1 : 1;
    if (run > MAX_REPEAT_RUN) return true;
  }
  return false;
}

/** Apakah mengandung deret berurutan (maju atau mundur) sepanjang MIN_SEQUENCE_RUN? */
function hasSequentialRun(value) {
  const lower = value.toLowerCase();
  for (const seq of SEQUENCES) {
    const reversed = [...seq].reverse().join("");
    for (const source of [seq, reversed]) {
      for (let i = 0; i + MIN_SEQUENCE_RUN <= source.length; i++) {
        if (lower.includes(source.slice(i, i + MIN_SEQUENCE_RUN))) return true;
      }
    }
  }
  return false;
}

/**
 * Apakah kata sandi memuat informasi identitas pengguna?
 *
 * Kata sandi yang berisi nama atau bagian email adalah tebakan pertama
 * penyerang yang sudah tahu email targetnya.
 */
function containsIdentity(password, { email, name } = {}) {
  const lower = password.toLowerCase();
  const candidates = [];

  if (email) candidates.push(String(email).split("@")[0]);
  if (name) candidates.push(...String(name).split(/\s+/));

  return candidates
    .map((c) => c.toLowerCase().trim())
    .filter((c) => c.length >= 4)
    .some((c) => lower.includes(c));
}

/**
 * Validasi kata sandi terhadap seluruh aturan.
 *
 * @param {string} password
 * @param {{email?: string, name?: string}} [context] Untuk cek identitas
 * @returns {Array<{field: string, message: string}>} kosong bila valid
 */
export function validatePassword(password, context = {}) {
  const errors = [];

  if (typeof password !== "string" || password.length === 0) {
    return [err("Kata sandi wajib diisi.")];
  }

  // ─── Panjang ───────────────────────────────────────────────────────
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(err(`Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`));
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(err(`Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`));
  }

  // Spasi di awal/akhir hampir selalu tidak disengaja dan menyebabkan
  // kegagalan login yang membingungkan.
  if (password !== password.trim()) {
    errors.push(err("Kata sandi tidak boleh diawali atau diakhiri spasi."));
  }

  // ─── Komposisi ─────────────────────────────────────────────────────
  if (!/[A-Z]/.test(password)) {
    errors.push(err("Kata sandi harus memuat minimal satu huruf kapital."));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(err("Kata sandi harus memuat minimal satu huruf kecil."));
  }
  if (!/[0-9]/.test(password)) {
    errors.push(err("Kata sandi harus memuat minimal satu angka."));
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push(err("Kata sandi harus memuat minimal satu karakter spesial (mis. ! @ # $ %)."));
  }

  // ─── Pola yang mudah ditebak ───────────────────────────────────────
  if (hasRepeatRun(password)) {
    errors.push(
      err(`Kata sandi tidak boleh memuat karakter sama berulang lebih dari ${MAX_REPEAT_RUN} kali (mis. "1111").`),
    );
  }
  if (hasSequentialRun(password)) {
    errors.push(err('Kata sandi tidak boleh memuat deret berurutan (mis. "1234", "abcd", "qwer").'));
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push(err("Kata sandi ini terlalu umum dan mudah ditebak."));
  }
  if (containsIdentity(password, context)) {
    errors.push(err("Kata sandi tidak boleh memuat nama atau alamat email Anda."));
  }

  return errors;
}

/**
 * Skor kekuatan 0-4, untuk indikator visual di frontend.
 * Bukan pengganti validatePassword — hanya umpan balik saat mengetik.
 */
export function passwordStrength(password) {
  if (typeof password !== "string" || !password) return 0;

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (hasRepeatRun(password) || hasSequentialRun(password)) score = Math.max(0, score - 2);

  return Math.min(4, score);
}
