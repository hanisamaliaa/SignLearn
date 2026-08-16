import readline from "node:readline/promises";
import { withTransaction, closePool, testConnection, query } from "../config/database.js";
import { COURSE_CATALOGUE, insertCatalogue } from "./courseCatalogue.js";

/**
 * Menimpa seluruh katalog kursus.
 *
 *   npm run db:reset-content
 *   npm run db:reset-content -- --yes     (tanpa konfirmasi, untuk CI)
 *
 * Berbeda dari `seed`, yang sengaja tidak merusak dan melewati tabel yang
 * sudah berisi. Perintah itu tidak dapat memperbaiki data yang sudah kacau —
 * duplikat, sisa uji coba, atau `total_lessons` yang tidak cocok dengan
 * jumlah barisnya.
 *
 * ── Yang ikut terhapus ───────────────────────────────────────────────
 *
 * `courses` adalah akar dari pelajaran, kuis, pertanyaan, dan progres. Foreign
 * key CASCADE membawa semuanya. Itu berarti perintah ini MENGHAPUS PROGRES
 * BELAJAR dan hasil kuis seluruh pengguna, bukan hanya data contoh. Karena itu
 * ia meminta konfirmasi dan melaporkan lebih dulu apa yang akan hilang.
 *
 * Akun pengguna, peran, dan bank terjemahan tidak tersentuh.
 */

async function summarize() {
  const { rows } = await query(`
    SELECT (SELECT COUNT(*) FROM courses)::int         AS courses,
           (SELECT COUNT(*) FROM lessons)::int         AS lessons,
           (SELECT COUNT(*) FROM quizzes)::int         AS quizzes,
           (SELECT COUNT(*) FROM quiz_questions)::int  AS questions,
           (SELECT COUNT(*) FROM lesson_progress)::int AS progress,
           (SELECT COUNT(*) FROM quiz_results)::int    AS results
  `);
  return rows[0];
}

async function confirm(before) {
  if (process.argv.includes("--yes")) return true;
  if (!process.stdin.isTTY) {
    console.error("  ✗ Tidak ada terminal interaktif. Ulangi dengan flag --yes bila memang disengaja.");
    return false;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n  Ketik "HAPUS" untuk menimpa ${before.courses} kursus ` +
    `beserta ${before.progress} progres dan ${before.results} hasil kuis: `,
  );
  rl.close();
  return answer.trim() === "HAPUS";
}

async function main() {
  await testConnection();

  const before = await summarize();
  console.log("\n  Isi saat ini:");
  console.log(`    kursus ${before.courses} · pelajaran ${before.lessons} · kuis ${before.quizzes} · soal ${before.questions}`);
  console.log(`    progres belajar ${before.progress} · hasil kuis ${before.results}   <- ikut terhapus`);
  console.log(`\n  Akan diganti dengan ${COURSE_CATALOGUE.length} kursus dari courseCatalogue.js.`);

  if (!(await confirm(before))) {
    console.log("\n  Dibatalkan. Tidak ada yang diubah.");
    return;
  }

  // Satu transaksi: gagal di tengah akan menyisakan database tanpa kursus
  // sama sekali, keadaan yang jauh lebih buruk daripada katalog lama.
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM courses`);
    await insertCatalogue(client);
  });

  const after = await summarize();
  console.log("\n  ✓ Selesai:");
  console.log(`    kursus ${after.courses} · pelajaran ${after.lessons} · kuis ${after.quizzes} · soal ${after.questions}`);
}

main()
  .catch((error) => {
    console.error("\n  ✗ Gagal:", error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
