import { query, withTransaction } from "../config/database.js";

/**
 * Repository lesson — satu-satunya lapisan yang mengetahui nama kolom SQL.
 *
 * Service bekerja dengan objek camelCase; pemetaan terjadi di sini
 * (API Contract §2.5). Seluruh query berparameter.
 */

const COLUMNS = `
  id, course_id, title, description, duration, video_url,
  sort_order, is_locked, created_at, updated_at
`;

/**
 * Memetakan baris DB ke DTO API.
 *
 * `id` dan `courseId` dikembalikan sebagai STRING: BIGINT Postgres melebihi
 * `Number.MAX_SAFE_INTEGER`, dan mengubahnya ke number membulatkan diam-diam.
 */
export function toLessonDto(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: row.title,
    description: row.description ?? null,
    duration: row.duration ?? null,
    videoUrl: row.video_url ?? null,
    sortOrder: Number(row.sort_order),
    isLocked: row.is_locked,
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

// ─── Baca ────────────────────────────────────────────────────────────────

export async function findByCourse(courseId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM lessons
      WHERE course_id = $1
      ORDER BY sort_order ASC, id ASC
      LIMIT $2 OFFSET $3`,
    [courseId, limit, offset],
  );
  return rows.map(toLessonDto);
}

export async function countByCourse(courseId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM lessons WHERE course_id = $1`,
    [courseId],
  );
  return rows[0].total;
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM lessons WHERE id = $1 LIMIT 1`,
    [id],
  );
  return toLessonDto(rows[0]);
}

/**
 * Tetangga sebelum & sesudah dalam urutan kursus.
 *
 * Dihitung di server agar frontend tidak perlu memuat seluruh daftar
 * pelajaran hanya untuk membuat tombol "sebelumnya / berikutnya"
 * (API Contract §8.7).
 */
export async function findNeighbours(courseId, sortOrder, id) {
  const { rows } = await query(
    `(SELECT id, title, 'prev' AS side FROM lessons
       WHERE course_id = $1 AND (sort_order, id) < ($2, $3)
       ORDER BY sort_order DESC, id DESC LIMIT 1)
     UNION ALL
     (SELECT id, title, 'next' AS side FROM lessons
       WHERE course_id = $1 AND (sort_order, id) > ($2, $3)
       ORDER BY sort_order ASC, id ASC LIMIT 1)`,
    [courseId, sortOrder, id],
  );

  const pick = (side) => {
    const r = rows.find((x) => x.side === side);
    return r ? { id: String(r.id), title: r.title } : null;
  };
  return { prev: pick("prev"), next: pick("next") };
}

/** Status penyelesaian pelajaran untuk satu pengguna, dipakai halaman Learn. */
export async function findByCourseWithProgress(courseId, userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${COLUMNS.split(",").map((c) => `l.${c.trim()}`).join(", ")},
            COALESCE(p.status, 'not_started') AS progress_status,
            p.completed_at
       FROM lessons l
       LEFT JOIN lesson_progress p
              ON p.lesson_id = l.id AND p.user_id = $2
      WHERE l.course_id = $1
      ORDER BY l.sort_order ASC, l.id ASC
      LIMIT $3 OFFSET $4`,
    [courseId, userId, limit, offset],
  );

  return rows.map((row) => ({
    ...toLessonDto(row),
    status: row.progress_status,
    completedAt: row.completed_at?.toISOString() ?? null,
  }));
}

// ─── Tulis ───────────────────────────────────────────────────────────────

/**
 * Membuat pelajaran dan menyelaraskan `courses.total_lessons`.
 *
 * Keduanya dalam SATU transaksi. Bila hanya baris pelajaran yang tersimpan,
 * `total_lessons` langsung berbohong — dan angka itu tampil di kartu kursus,
 * progress bar, serta laporan admin.
 *
 * `sort_order` dihitung server bila tidak dikirim: MAX + 1 dalam kursus,
 * sehingga pelajaran baru selalu berada di urutan terakhir.
 */
export async function create(data) {
  return withTransaction(async (client) => {
    let sortOrder = data.sortOrder;

    if (sortOrder === undefined || sortOrder === null) {
      const { rows } = await client.query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM lessons WHERE course_id = $1`,
        [data.courseId],
      );
      sortOrder = rows[0].next;
    }

    const { rows } = await client.query(
      `INSERT INTO lessons (course_id, title, description, duration, video_url, sort_order, is_locked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLUMNS}`,
      [
        data.courseId,
        data.title.trim(),
        data.description ?? null,
        data.duration ?? null,
        data.videoUrl ?? null,
        sortOrder,
        data.isLocked ?? false,
      ],
    );

    await client.query(
      `UPDATE courses
          SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = $1)
        WHERE id = $1`,
      [data.courseId],
    );

    return toLessonDto(rows[0]);
  });
}

/**
 * Partial update — hanya field yang dikirim yang diubah.
 *
 * Versi sebelumnya menulis SELURUH kolom dari `req.body`. Mengirim `{title}`
 * saja membuat `description` dan `video_url` menjadi NULL secara diam-diam,
 * dan `course_id`/`sort_order` yang NOT NULL memicu error 500 yang
 * membingungkan. Membangun klausa SET secara dinamis menutup keduanya.
 */
export async function update(id, data) {
  const columnMap = {
    courseId: "course_id",
    title: "title",
    description: "description",
    duration: "duration",
    videoUrl: "video_url",
    sortOrder: "sort_order",
    isLocked: "is_locked",
  };

  const sets = [];
  const values = [id];

  for (const [key, column] of Object.entries(columnMap)) {
    if (data[key] !== undefined) {
      values.push(key === "title" ? String(data[key]).trim() : data[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (sets.length === 0) return findById(id);

  // Pemindahan antar-kursus mengubah hitungan DUA kursus sekaligus,
  // jadi harus atomik.
  const movingCourse = data.courseId !== undefined;

  if (!movingCourse) {
    const { rows } = await query(
      `UPDATE lessons SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
      values,
    );
    return toLessonDto(rows[0]);
  }

  return withTransaction(async (client) => {
    const { rows: before } = await client.query(
      `SELECT course_id FROM lessons WHERE id = $1`,
      [id],
    );
    const oldCourseId = before[0]?.course_id;

    const { rows } = await client.query(
      `UPDATE lessons SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
      values,
    );

    for (const courseId of new Set([oldCourseId, data.courseId].filter(Boolean))) {
      await client.query(
        `UPDATE courses
            SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = $1)
          WHERE id = $1`,
        [courseId],
      );
    }

    return toLessonDto(rows[0]);
  });
}

export async function remove(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `DELETE FROM lessons WHERE id = $1 RETURNING course_id`,
      [id],
    );
    if (!rows[0]) return false;

    await client.query(
      `UPDATE courses
          SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = $1)
        WHERE id = $1`,
      [rows[0].course_id],
    );
    return true;
  });
}

/**
 * Mengurutkan ulang seluruh pelajaran dalam satu kursus.
 *
 * Satu transaksi untuk seluruh daftar. Melakukannya lewat N request PUT
 * terpisah dapat gagal separuh jalan dan meninggalkan urutan yang rusak
 * (API Contract §8.9).
 */
export async function reorder(courseId, orderedIds) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM lessons WHERE course_id = $1`,
      [courseId],
    );
    const existing = rows.map((r) => String(r.id)).sort();
    const incoming = orderedIds.map(String).sort();

    // Daftar harus LENGKAP. Urutan parsial akan menabrakkan sort_order
    // pelajaran yang tidak disebut dengan yang disebut.
    if (existing.length !== incoming.length || existing.some((v, i) => v !== incoming[i])) {
      const error = new Error("INCOMPLETE_ORDER");
      error.code = "INCOMPLETE_ORDER";
      throw error;
    }

    for (const [index, lessonId] of orderedIds.entries()) {
      await client.query(
        `UPDATE lessons SET sort_order = $2 WHERE id = $1 AND course_id = $3`,
        [lessonId, index + 1, courseId],
      );
    }

    const { rows: updated } = await client.query(
      `SELECT ${COLUMNS} FROM lessons WHERE course_id = $1 ORDER BY sort_order ASC`,
      [courseId],
    );
    return updated.map(toLessonDto);
  });
}

/** Apakah ada pengguna yang sudah menyelesaikan pelajaran ini? */
export async function hasCompletions(id) {
  const { rows } = await query(
    `SELECT 1 FROM lesson_progress
      WHERE lesson_id = $1 AND status = 'completed' LIMIT 1`,
    [id],
  );
  return rows.length > 0;
}
