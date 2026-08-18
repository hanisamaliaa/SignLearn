#!/usr/bin/env node
/**
 * Membersihkan sisa data yang dibuat smoke test.
 *
 *   npm run clean:test-data          # tampilkan saja, tidak menghapus
 *   npm run clean:test-data -- --yes # benar-benar menghapus
 *
 * ── Mengapa skrip ini ada ─────────────────────────────────────────────
 *
 * Suite smoke membuat akun dan konten sungguhan pada database sungguhan —
 * itulah yang membuatnya berharga, karena yang diuji adalah Express, middleware,
 * dan PostgreSQL sebagai satu kesatuan. Konsekuensinya sampah menumpuk: setiap
 * kali `smoke:all` dijalankan, puluhan baris baru tertinggal.
 *
 * ── Mengapa pola pencocokannya sempit ─────────────────────────────────
 *
 * Menghapus baris dari database berisi data asli adalah tindakan yang tidak
 * dapat dibatalkan, jadi skrip ini hanya mengenali dua pola yang MUSTAHIL
 * dihasilkan pemakaian normal:
 *
 *   · email berdomain `@signlearn.test` — TLD `.test` dicadangkan RFC 2606
 *     dan tidak akan pernah menjadi alamat sungguhan
 *   · judul kursus berpola `Konten Uji <stempel>` / `Kursus Uji Dashboard
 *     <stempel>`, dengan stempel waktu 13 digit di belakangnya
 *
 * Bawaannya menampilkan saja. Penghapusan harus diminta secara eksplisit,
 * karena skrip yang menghapus begitu dijalankan cepat atau lambat akan
 * dijalankan tanpa sengaja.
 */

import "../src/config/env.js";
import { query, withTransaction, closePool } from "../src/config/database.js";

const TEST_EMAIL = "%@signlearn.test";
// `_` adalah wildcard satu karakter di LIKE, jadi 13 di antaranya mencocokkan
// stempel waktu milidetik — dan hanya itu.
const STAMP = "_____________";
const TEST_COURSE_TITLES = [`Konten Uji ${STAMP}`, `Kursus Uji Dashboard ${STAMP}`];

const apply = process.argv.includes("--yes");

async function survey() {
  const { rows: users } = await query(
    "SELECT COUNT(*)::int AS n FROM users WHERE email LIKE $1", [TEST_EMAIL],
  );
  const { rows: courses } = await query(
    `SELECT COUNT(*)::int AS n FROM courses
      WHERE title LIKE $1 OR title LIKE $2`, TEST_COURSE_TITLES,
  );
  const { rows: lessons } = await query(
    `SELECT COUNT(*)::int AS n FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE c.title LIKE $1 OR c.title LIKE $2`, TEST_COURSE_TITLES,
  );
  const { rows: kept } = await query(
    "SELECT COUNT(*)::int AS n FROM users WHERE email NOT LIKE $1", [TEST_EMAIL],
  );
  const { rows: keptCourses } = await query(
    `SELECT COUNT(*)::int AS n FROM courses
      WHERE title NOT LIKE $1 AND title NOT LIKE $2`, TEST_COURSE_TITLES,
  );
  return {
    users: users[0].n, courses: courses[0].n, lessons: lessons[0].n,
    keptUsers: kept[0].n, keptCourses: keptCourses[0].n,
  };
}

async function main() {
  const before = await survey();

  console.info("\nAkan dihapus:");
  console.info(`  akun uji (@signlearn.test) .......... ${before.users}`);
  console.info(`  kursus uji .......................... ${before.courses}`);
  console.info(`  pelajaran di dalamnya (cascade) ..... ${before.lessons}`);
  console.info("\nDipertahankan:");
  console.info(`  akun asli ........................... ${before.keptUsers}`);
  console.info(`  kursus asli ......................... ${before.keptCourses}`);

  if (!before.users && !before.courses) {
    console.info("\nDatabase sudah bersih.\n");
    return;
  }

  if (!apply) {
    console.info("\nTidak ada yang dihapus. Tambahkan --yes untuk benar-benar membersihkan.\n");
    return;
  }

  // Satu transaksi: pembersihan separuh jalan meninggalkan keadaan yang lebih
  // membingungkan daripada tidak dibersihkan sama sekali.
  await withTransaction(async (client) => {
    // Seluruh anak (subscriptions, payments, progres, token) ikut terhapus
    // lewat ON DELETE CASCADE, jadi tidak ada baris yatim yang tertinggal.
    await client.query("DELETE FROM users WHERE email LIKE $1", [TEST_EMAIL]);
    await client.query(
      `DELETE FROM courses WHERE title LIKE $1 OR title LIKE $2`, TEST_COURSE_TITLES,
    );
  });

  const after = await survey();
  console.info("\nSelesai. Sisa sekarang:");
  console.info(`  akun uji ............................ ${after.users}`);
  console.info(`  kursus uji .......................... ${after.courses}`);
  console.info(`  akun asli (tidak tersentuh) ......... ${after.keptUsers}`);
  console.info(`  kursus asli (tidak tersentuh) ....... ${after.keptCourses}\n`);
}

main()
  .catch((error) => {
    console.error(`\nGagal membersihkan: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(closePool);
