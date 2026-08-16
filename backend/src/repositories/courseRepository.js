import { query } from "../config/database.js";

/**
 * Repository kursus — satu-satunya lapisan yang mengetahui nama kolom SQL.
 *
 * ── Kenapa `pg`, bukan @supabase/supabase-js ──────────────────────────
 *
 * SDK Supabase tidak mendukung transaksi (ia berbicara ke PostgREST lewat
 * HTTP, satu request per panggilan) dan dirancang untuk klien dengan RLS
 * sebagai penjaganya. Backend ini sudah melakukan otorisasi sendiri lewat
 * JWT + RBAC, sementara JOIN dan agregasi di bawah mustahil lewat SDK.
 */

const COLUMNS = `
  id, title, title_en, category, level, description, thumbnail,
  total_lessons, estimated_hours, is_locked, sort_order,
  created_at, updated_at
`;

/**
 * Allowlist kolom pengurutan.
 *
 * `sortBy` TIDAK PERNAH diinterpolasi langsung ke SQL. Nilai dari klien
 * dicocokkan ke peta ini; yang tidak cocok tidak akan pernah sampai ke query.
 * Tanpa ini, `?sortBy=` menjadi jalur SQL injection.
 */
const SORTABLE = {
  sortOrder: "c.sort_order",
  title: "c.title",
  createdAt: "c.created_at",
  level: "c.level",
};

export function toCourseDto(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    title: row.title,
    titleEn: row.title_en ?? null,
    category: row.category ?? null,
    level: row.level,
    description: row.description ?? null,
    thumbnail: row.thumbnail ?? null,
    totalLessons: Number(row.total_lessons),
    estimatedHours: Number(row.estimated_hours),
    isLocked: row.is_locked,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

/** Membangun klausa WHERE + parameter dari filter. */
function buildFilters({ q, category, level }, startIndex = 1) {
  const clauses = [];
  const values = [];
  let i = startIndex;

  if (q && String(q).trim().length >= 2) {
    // ILIKE = case-insensitive di Postgres.
    //
    // `%` dan `_` adalah wildcard LIKE, jadi harus di-escape sebelum
    // dibungkus wildcard kita sendiri. Tanpa ini, pengguna yang mengetik
    // "100%" mendapat seluruh baris, dan "_" mencocokkan karakter apa pun.
    // Parameterisasi mencegah SQL injection, TIDAK mencegah ini.
    const escaped = String(q).trim().replace(/[\\%_]/g, (ch) => `\\${ch}`);
    values.push(`%${escaped}%`);
    clauses.push(`(c.title ILIKE $${i} ESCAPE '\\' OR c.title_en ILIKE $${i} ESCAPE '\\')`);
    i++;
  }
  if (category) {
    values.push(category);
    clauses.push(`c.category = $${i++}`);
  }
  if (level) {
    values.push(level);
    clauses.push(`c.level = $${i++}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
    nextIndex: i,
  };
}

// ─── Baca ────────────────────────────────────────────────────────────────

export async function count(filters = {}) {
  const { where, values } = buildFilters(filters);
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM courses c ${where}`, values);
  return rows[0].total;
}

export async function findAll(filters = {}, { limit = 20, offset = 0, sortBy = "sortOrder", sortDir = "asc" } = {}) {
  const column = SORTABLE[sortBy] ?? SORTABLE.sortOrder;
  const direction = String(sortDir).toLowerCase() === "desc" ? "DESC" : "ASC";

  const { where, values, nextIndex } = buildFilters(filters);
  values.push(limit, offset);

  const { rows } = await query(
    `SELECT ${COLUMNS.split(",").map((c) => `c.${c.trim()}`).join(", ")}
       FROM courses c
       ${where}
      ORDER BY ${column} ${direction}, c.id ASC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    values,
  );
  return rows.map(toCourseDto);
}

/**
 * Daftar kursus beserta progres satu pengguna.
 *
 * Dihitung lewat LEFT JOIN teragregasi, bukan N+1 query per kursus.
 * Dengan 12 kursus, pendekatan naif berarti 13 round-trip ke database
 * hanya untuk merender satu halaman.
 */
export async function findAllWithProgress(userId, filters = {}, options = {}) {
  const { limit = 20, offset = 0, sortBy = "sortOrder", sortDir = "asc" } = options;
  const column = SORTABLE[sortBy] ?? SORTABLE.sortOrder;
  const direction = String(sortDir).toLowerCase() === "desc" ? "DESC" : "ASC";

  const { where, values, nextIndex } = buildFilters(filters);
  values.push(userId, limit, offset);
  const userIdx = nextIndex;

  const { rows } = await query(
    `SELECT ${COLUMNS.split(",").map((c) => `c.${c.trim()}`).join(", ")},
            COALESCE(p.completed, 0)::int AS completed_lessons,
            COALESCE(p.started, 0)::int   AS started_lessons,
            p.last_seen
       FROM courses c
       LEFT JOIN (
         SELECT l.course_id,
                COUNT(*) FILTER (WHERE lp.status = 'completed') AS completed,
                COUNT(*)                                        AS started,
                MAX(lp.updated_at) AS last_seen
           FROM lessons l
           JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $${userIdx}
          GROUP BY l.course_id
       ) p ON p.course_id = c.id
       ${where}
      ORDER BY ${column} ${direction}, c.id ASC
      LIMIT $${userIdx + 1} OFFSET $${userIdx + 2}`,
    values,
  );

  return rows.map((row) => {
    const dto = toCourseDto(row);
    return {
      ...dto,
      progress: buildProgress(
        Number(row.started_lessons ?? 0),
        Number(row.completed_lessons),
        dto.totalLessons,
        row.last_seen,
      ),
    };
  });
}

/**
 * Status belajar sebuah kursus bagi satu pengguna.
 *
 * Diturunkan di server, bukan di tiap halaman. Sebelumnya frontend menebaknya
 * dengan `completedLessons > 0 && completedLessons < totalLessons`, yang
 * MUSTAHIL benar untuk kursus berisi satu pelajaran: nilainya hanya bisa 0
 * atau 1, sehingga kursus yang sedang dipelajari tidak pernah terhitung dan
 * ringkasan selalu menampilkan "0 belajar".
 */
function courseProgressStatus({ startedLessons, completedLessons, totalLessons }) {
  if (totalLessons === 0) return "empty";
  if (completedLessons >= totalLessons) return "completed";
  if (startedLessons > 0) return "in_progress";
  return "not_started";
}

function buildProgress(started, completed, totalLessons, lastSeen) {
  return {
    startedLessons: started,
    completedLessons: completed,
    totalLessons,
    percent: totalLessons ? Math.round((completed / totalLessons) * 100) : 0,
    status: courseProgressStatus({
      startedLessons: started, completedLessons: completed, totalLessons,
    }),
    lastAccessedAt: lastSeen?.toISOString() ?? null,
  };
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM courses WHERE id = $1 LIMIT 1`,
    [id],
  );
  return toCourseDto(rows[0]);
}

export async function findByIdWithProgress(id, userId) {
  const course = await findById(id);
  if (!course) return null;

  const { rows } = await query(
    `SELECT COUNT(*) FILTER (WHERE lp.status = 'completed')::int AS completed,
            COUNT(lp.id)::int                                    AS started,
            MAX(lp.updated_at) AS last_seen
       FROM lessons l
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $2
      WHERE l.course_id = $1`,
    [id, userId],
  );

  return {
    ...course,
    progress: buildProgress(
      Number(rows[0]?.started ?? 0),
      Number(rows[0]?.completed ?? 0),
      course.totalLessons,
      rows[0]?.last_seen,
    ),
  };
}

/** Kuis milik kursus — dipakai halaman detail (API Contract §8.2). */
export async function findQuizzes(courseId) {
  const { rows } = await query(
    `SELECT id, course_id, lesson_id, title, total_questions,
            min_passing_score, duration_seconds, created_at, updated_at
       FROM quizzes WHERE course_id = $1 ORDER BY id ASC`,
    [courseId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    courseId: String(r.course_id),
    lessonId: r.lesson_id ? String(r.lesson_id) : null,
    title: r.title,
    totalQuestions: Number(r.total_questions),
    minPassingScore: Number(r.min_passing_score),
    durationSeconds: Number(r.duration_seconds),
    createdAt: r.created_at?.toISOString() ?? null,
    updatedAt: r.updated_at?.toISOString() ?? null,
  }));
}

/** Daftar kategori berikut jumlah kursusnya — untuk filter di UI. */
export async function listCategories() {
  const { rows } = await query(
    `SELECT category, COUNT(*)::int AS course_count
       FROM courses WHERE category IS NOT NULL
      GROUP BY category ORDER BY category ASC`,
  );
  return rows.map((r) => ({ category: r.category, courseCount: r.course_count }));
}

/** Apakah ada pelajaran di kursus ini yang sudah diselesaikan pengguna? */
export async function hasCompletions(courseId) {
  const { rows } = await query(
    `SELECT 1
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
      WHERE l.course_id = $1 AND lp.status = 'completed'
      LIMIT 1`,
    [courseId],
  );
  return rows.length > 0;
}

// ─── Tulis ───────────────────────────────────────────────────────────────

/**
 * `total_lessons` TIDAK diterima dari klien — ia dihitung dari baris lessons
 * dan dipelihara lessonRepository. Menerimanya membuat dua sumber kebenaran.
 */
export async function create(data) {
  const { rows } = await query(
    `INSERT INTO courses
       (title, title_en, category, level, description, thumbnail,
        estimated_hours, is_locked, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
             COALESCE($9, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM courses)))
     RETURNING ${COLUMNS}`,
    [
      data.title.trim(),
      data.titleEn ?? null,
      data.category ?? null,
      data.level,
      data.description ?? null,
      data.thumbnail ?? null,
      data.estimatedHours ?? 0,
      data.isLocked ?? false,
      data.sortOrder ?? null,
    ],
  );
  return toCourseDto(rows[0]);
}

/** Partial update — hanya field yang dikirim yang diubah. */
export async function update(id, data) {
  const columnMap = {
    title: "title",
    titleEn: "title_en",
    category: "category",
    level: "level",
    description: "description",
    thumbnail: "thumbnail",
    estimatedHours: "estimated_hours",
    isLocked: "is_locked",
    sortOrder: "sort_order",
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

  const { rows } = await query(
    `UPDATE courses SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
    values,
  );
  return toCourseDto(rows[0]);
}

export async function remove(id) {
  const { rowCount } = await query(`DELETE FROM courses WHERE id = $1`, [id]);
  return rowCount > 0;
}
