/**
 * Mengisi Bank Kata BISINDO.
 *
 *     npm run seed:wordbank
 *
 * Aman dijalankan berulang kali, dan TIDAK menghapus apa pun. Setiap entri
 * di-upsert berdasarkan `normalized_word`, sehingga menjalankannya dua kali
 * menghasilkan keadaan yang sama persis.
 *
 * Sifat upsert itu sekaligus memperbaiki baris rusak yang sudah ada: satu-
 * satunya baris di basis data adalah "halo" dengan tautan halaman YouTube di
 * kolom gambar dan tautan yang sama tertempel dua kali di kolom video. Ia
 * ditimpa oleh entri "Halo" yang benar, bukan dihapus lalu dibuat ulang —
 * id-nya bertahan, dan tidak ada rujukan yang terputus.
 */

import "../config/env.js"; // memuat .env sebelum pool dibuat
import { query, closePool } from "../config/database.js";
import { normalizeWord } from "../utils/normalizeWord.js";
import { WORD_BANK } from "./wordBank.js";

async function seed() {
  let created = 0;
  let updated = 0;
  const repaired = [];

  for (const entry of WORD_BANK) {
    const normalized = normalizeWord(entry.word);

    // Dicatat sebelum ditimpa, supaya laporan akhirnya menyebutkan persis
    // baris mana yang isinya diperbaiki dan bukan sekadar "n baris diperbarui".
    const { rows: before } = await query(
      `SELECT translation, sign_image, sign_video FROM translations
        WHERE normalized_word = $1`,
      [normalized],
    );
    const previous = before[0];
    if (previous?.sign_image || previous?.sign_video) {
      repaired.push({
        word: entry.word,
        signImage: previous.sign_image,
        signVideo: previous.sign_video,
      });
    }

    const { rows } = await query(
      `INSERT INTO translations
         (word, normalized_word, translation, description, category,
          status, sign_image, sign_video, aliases)
       VALUES ($1, $2, $3, $4, $5, 'active', NULL, NULL, $6)
       ON CONFLICT (normalized_word) DO UPDATE SET
         word        = EXCLUDED.word,
         translation = EXCLUDED.translation,
         description = EXCLUDED.description,
         category    = EXCLUDED.category,
         status      = 'active',
         -- Dikosongkan dengan sengaja: nilai lama pada dua kolom ini justru
         -- yang membuat kamus tampil rusak.
         sign_image  = NULL,
         sign_video  = NULL,
         aliases     = EXCLUDED.aliases
       RETURNING (xmax = 0) AS inserted`,
      [entry.word, normalized, entry.translation, entry.description, entry.category, entry.aliases],
    );

    if (rows[0].inserted) created += 1;
    else updated += 1;
  }

  const { rows: totals } = await query(
    `SELECT category, COUNT(*)::int AS n FROM translations GROUP BY 1 ORDER BY 1`,
  );

  console.info(`\nBank Kata: ${created} kata baru, ${updated} kata diperbarui.`);
  if (repaired.length) {
    console.info("\nMedia rusak yang dibersihkan:");
    for (const item of repaired) {
      console.info(`  ${item.word}`);
      if (item.signImage) console.info(`    gambar : ${item.signImage}`);
      if (item.signVideo) console.info(`    video  : ${item.signVideo}`);
    }
  }
  console.info("\nIsi Bank Kata per kategori:");
  for (const row of totals) console.info(`  ${row.category.padEnd(18)} ${row.n}`);

  const { rows: grand } = await query(`SELECT COUNT(*)::int AS n FROM translations`);
  console.info(`  ${"TOTAL".padEnd(18)} ${grand[0].n}\n`);
}

seed()
  .catch((error) => {
    console.error(`Gagal mengisi Bank Kata: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closePool);
