import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { query, withTransaction, closePool, testConnection } from "../config/database.js";
import { validatePassword } from "../validators/passwordPolicy.js";

/**
 * Seed database.
 *
 *   npm run seed
 *
 * Sifat:
 *   · IDEMPOTEN — aman dijalankan berulang; tidak menduplikasi baris
 *   · TIDAK merusak — hanya menyisipkan yang belum ada
 *   · TANPA kredensial default — lihat catatan di bawah
 *
 * ── Kenapa tidak ada password admin bawaan ────────────────────────
 *
 * Kredensial default adalah salah satu penyebab pembobolan paling umum:
 * ia ikut ter-commit, tersalin ke produksi, dan tidak pernah diganti.
 *
 * Skrip ini membaca SEED_ADMIN_PASSWORD dari environment. Bila tidak ada,
 * ia MEMBANGKITKAN kata sandi acak kuat dan menampilkannya SEKALI. Tidak
 * pernah ada nilai lemah yang diketahui publik.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@signlearn.local";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrator";

/**
 * Membangkitkan kata sandi yang memenuhi kebijakan (§passwordPolicy).
 *
 * Dibangun per golongan karakter, bukan diacak dari satu himpunan besar —
 * pengacakan polos bisa menghasilkan string tanpa angka atau tanpa simbol,
 * yang lalu ditolak validator kita sendiri.
 */
function generateStrongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // tanpa I, O
  const lower = "abcdefghijkmnpqrstuvwxyz"; // tanpa l, o
  const digit = "23456789"; // tanpa 0, 1
  const symbol = "!@#$%^&*?";

  const pick = (set, n) =>
    Array.from({ length: n }, () => set[crypto.randomInt(set.length)]).join("");

  // Disusun berselang-seling agar tidak ada karakter sama berturut-turut
  // maupun deret berurutan — dua hal yang ditolak kebijakan.
  const parts = [
    pick(upper, 2), pick(lower, 3), pick(digit, 2),
    pick(symbol, 1), pick(lower, 3), pick(upper, 1),
    pick(digit, 1), pick(symbol, 1),
  ];

  const password = parts.join("");
  const errors = validatePassword(password);

  // Sangat jarang, tetapi bila tetap gagal (mis. kebetulan membentuk deret),
  // coba lagi ketimbang mengirim kata sandi yang tidak lolos kebijakan.
  return errors.length === 0 ? password : generateStrongPassword();
}

// ─── Konten contoh ───────────────────────────────────────────────────────
// Agar FE dan CMS punya data untuk dikembangkan sejak hari pertama.
const SAMPLE_COURSES = [
  {
    title: "Abjad BISINDO",
    titleEn: "BISINDO Alphabet",
    category: "Dasar",
    level: "Pemula",
    description: "Mengenal 26 huruf BISINDO dan cara mengejanya.",
    estimatedHours: 2.0,
    sortOrder: 1,
    lessons: [
      { title: "Huruf A sampai E", duration: "6 menit", sortOrder: 1 },
      { title: "Huruf F sampai J", duration: "6 menit", sortOrder: 2 },
      { title: "Huruf K sampai O", duration: "7 menit", sortOrder: 3 },
    ],
  },
  {
    title: "Sapaan Sehari-hari",
    titleEn: "Everyday Greetings",
    category: "Dasar",
    level: "Pemula",
    description: "Kosakata sapaan yang paling sering dipakai.",
    estimatedHours: 2.5,
    sortOrder: 2,
    lessons: [
      { title: "Selamat Pagi, Siang, Malam", duration: "8 menit", sortOrder: 1 },
      { title: "Apa Kabar dan Terima Kasih", duration: "7 menit", sortOrder: 2 },
    ],
  },
  {
    title: "Aktivitas Harian",
    titleEn: "Daily Activities",
    category: "Menengah",
    level: "Menengah",
    description: "Kata kerja untuk kegiatan sehari-hari.",
    estimatedHours: 3.0,
    sortOrder: 3,
    lessons: [
      { title: "Makan, Minum, Tidur", duration: "9 menit", sortOrder: 1 },
      { title: "Belajar, Membaca, Menulis", duration: "9 menit", sortOrder: 2 },
    ],
  },
];

const SAMPLE_TRANSLATIONS = [
  { word: "Halo", translation: "HALO", category: "Sapaan", aliases: ["hai"] },
  { word: "Terima kasih", translation: "TERIMA KASIH", category: "Sapaan", aliases: ["terimakasih", "makasih"] },
  { word: "Maaf", translation: "MAAF", category: "Percakapan", aliases: [] },
  { word: "Tolong", translation: "TOLONG", category: "Percakapan", aliases: [] },
  { word: "Teman", translation: "TEMAN", category: "Keluarga dan Sosial", aliases: ["kawan"] },
];

// ─── Langkah seed ────────────────────────────────────────────────────────

async function seedRoles() {
  await query(
    `INSERT INTO roles (name) VALUES ('admin'), ('user')
     ON CONFLICT (name) DO NOTHING`,
  );
  console.log("  ✓ roles");
}

async function seedAdmin() {
  const { rows } = await query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [ADMIN_EMAIL],
  );

  if (rows[0]) {
    console.log(`  · admin sudah ada (${ADMIN_EMAIL}) — dilewati`);
    return null;
  }

  const provided = process.env.SEED_ADMIN_PASSWORD;
  let password = provided;

  if (provided) {
    const errors = validatePassword(provided, { email: ADMIN_EMAIL, name: ADMIN_NAME });
    if (errors.length > 0) {
      console.error("\n  ✗ SEED_ADMIN_PASSWORD tidak memenuhi kebijakan:");
      for (const e of errors) console.error(`      - ${e.message}`);
      process.exit(1);
    }
  } else {
    password = generateStrongPassword();
  }

  const passwordHash = await bcrypt.hash(password, env.security.bcryptRounds);

  await query(
    `INSERT INTO users (role_id, name, email, password_hash, profile, status)
     VALUES ((SELECT id FROM roles WHERE name = 'admin'), $1, LOWER($2), $3, 'general', 'active')`,
    [ADMIN_NAME, ADMIN_EMAIL, passwordHash],
  );

  console.log(`  ✓ admin dibuat (${ADMIN_EMAIL})`);
  return provided ? null : password; // hanya kembalikan bila kita yang membangkitkan
}

async function seedCourses() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM courses`);
  if (rows[0].n > 0) {
    console.log(`  · courses sudah berisi ${rows[0].n} baris — dilewati`);
    return;
  }

  // Satu transaksi: kursus tanpa pelajarannya lebih buruk daripada tidak ada
  // kursus sama sekali, karena total_lessons akan berbohong.
  await withTransaction(async (client) => {
    for (const c of SAMPLE_COURSES) {
      const { rows: courseRows } = await client.query(
        `INSERT INTO courses
           (title, title_en, category, level, description, estimated_hours, sort_order, total_lessons)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [c.title, c.titleEn, c.category, c.level, c.description,
         c.estimatedHours, c.sortOrder, c.lessons.length],
      );
      const courseId = courseRows[0].id;

      for (const l of c.lessons) {
        await client.query(
          `INSERT INTO lessons (course_id, title, duration, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [courseId, l.title, l.duration, l.sortOrder],
        );
      }
    }
  });

  const total = SAMPLE_COURSES.reduce((a, c) => a + c.lessons.length, 0);
  console.log(`  ✓ ${SAMPLE_COURSES.length} kursus, ${total} pelajaran`);
}

async function seedTranslations() {
  for (const item of SAMPLE_TRANSLATIONS) {
    await query(
      `INSERT INTO translations (word, normalized_word, translation, category, aliases)
       VALUES ($1, LOWER($1), $2, $3, $4)
       ON CONFLICT (normalized_word) DO NOTHING`,
      [item.word, item.translation, item.category, item.aliases],
    );
  }
  console.log(`  ✓ ${SAMPLE_TRANSLATIONS.length} kata BISINDO contoh`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  // Seed menulis data contoh dan akun admin — bukan sesuatu yang boleh
  // berjalan tanpa sengaja di produksi.
  if (env.isProduction && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    console.error("\n[seed] Ditolak: NODE_ENV=production.");
    console.error("       Setel SEED_ALLOW_PRODUCTION=true bila memang disengaja.\n");
    process.exit(1);
  }

  const db = await testConnection();
  if (!db.ok) {
    console.error(`\n[seed] Tidak dapat terhubung ke database: ${db.message}`);
    console.error("       Periksa DATABASE_URL di .env\n");
    process.exit(1);
  }

  console.log(`\n[seed] ${db.message}\n`);

  await seedRoles();
  const generatedPassword = await seedAdmin();
  await seedCourses();
  await seedTranslations();

  if (generatedPassword) {
    console.log(`
┌────────────────────────────────────────────────────────────┐
│  KATA SANDI ADMIN — DITAMPILKAN SEKALI INI SAJA            │
├────────────────────────────────────────────────────────────┤
│  Email    : ${ADMIN_EMAIL.padEnd(46)}│
│  Password : ${generatedPassword.padEnd(46)}│
├────────────────────────────────────────────────────────────┤
│  Simpan sekarang. Hanya hash-nya yang tersimpan di DB,     │
│  jadi ini tidak dapat ditampilkan ulang.                   │
│                                                            │
│  Untuk menentukan sendiri:                                 │
│    SEED_ADMIN_PASSWORD=... npm run seed                    │
└────────────────────────────────────────────────────────────┘
`);
  }

  console.log("[seed] Selesai.\n");
}

main()
  .catch((err) => {
    console.error("\n[seed] Gagal:", err.message);
    process.exit(1);
  })
  .finally(() => closePool());
