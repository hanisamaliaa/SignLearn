import { query } from "../config/database.js";

/**
 * Repository kursus.
 *
 * Dikonversi dari Supabase JS SDK ke driver `pg` langsung. Alasannya bukan
 * selera — lihat catatan di bawah.
 *
 * ── Kenapa `pg`, bukan @supabase/supabase-js ──────────────────────────
 *
 * 1. SDK Supabase TIDAK MENDUKUNG TRANSAKSI. Ia berbicara ke PostgREST lewat
 *    HTTP, dan setiap pemanggilan adalah request terpisah. Alur auth kita
 *    wajib atomik (rotasi refresh token, reset kata sandi) — tanpa transaksi,
 *    kegagalan separuh jalan meninggalkan pengguna tanpa sesi sama sekali.
 *
 * 2. SDK dirancang untuk KLIEN, dengan anon key + Row Level Security sebagai
 *    penjaganya. Backend kita sudah melakukan otorisasi sendiri lewat JWT dan
 *    middleware RBAC, jadi RLS tidak menambah apa pun di sini — sementara
 *    kita kehilangan JOIN, CTE, dan agregasi yang dibutuhkan endpoint laporan.
 *
 * 3. Satu jalur akses data untuk seluruh backend. Dua gaya query berdampingan
 *    berarti dua cara menangani error, dua cara memetakan kolom, dan dua tempat
 *    bug bersembunyi.
 *
 * Supabase tetap dipakai — sebagai PostgreSQL terkelola. Yang berubah hanya
 * cara menyambungnya: connection string, bukan SDK.
 */

function toCourseDto(row) {
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

export async function findAll({ limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT * FROM courses ORDER BY sort_order ASC, id ASC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows.map(toCourseDto);
}

export async function countAll() {
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM courses`);
  return rows[0].total;
}

export async function findById(id) {
  const { rows } = await query(`SELECT * FROM courses WHERE id = $1 LIMIT 1`, [id]);
  return toCourseDto(rows[0]);
}

export async function create(course) {
  const { rows } = await query(
    `INSERT INTO courses
       (title, title_en, category, level, description, thumbnail, estimated_hours, is_locked, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      course.title,
      course.titleEn ?? null,
      course.category ?? null,
      course.level ?? "Pemula",
      course.description ?? null,
      course.thumbnail ?? null,
      course.estimatedHours ?? 0,
      course.isLocked ?? false,
      course.sortOrder ?? 0,
    ],
  );
  return toCourseDto(rows[0]);
}

export async function update(id, fields) {
  // Allowlist kolom + pemetaan camelCase → snake_case.
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
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (sets.length === 0) return findById(id);

  const { rows } = await query(
    `UPDATE courses SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return toCourseDto(rows[0]);
}

export async function remove(id) {
  const { rowCount } = await query(`DELETE FROM courses WHERE id = $1`, [id]);
  return rowCount > 0;
}
