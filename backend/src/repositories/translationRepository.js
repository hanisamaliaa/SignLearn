import { query } from "../config/database.js";

const COLUMNS = `
  id, word, normalized_word, translation, description, category, status,
  sign_image, sign_video, aliases, created_at, updated_at
`;

function toDto(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    word: row.word,
    normalizedWord: row.normalized_word,
    translation: row.translation,
    description: row.description ?? null,
    category: row.category,
    status: row.status,
    signImage: row.sign_image ?? null,
    signVideo: row.sign_video ?? null,
    aliases: row.aliases ?? [],
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

function escapedLike(value) {
  return `%${String(value).trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function buildFilters({ q, category, status }, activeOnly = false) {
  const clauses = [];
  const values = [];
  if (q) {
    values.push(escapedLike(q));
    clauses.push(`(word ILIKE $${values.length} ESCAPE '\\' OR normalized_word ILIKE $${values.length} ESCAPE '\\' OR EXISTS (SELECT 1 FROM unnest(aliases) alias WHERE alias ILIKE $${values.length} ESCAPE '\\'))`);
  }
  if (category) {
    values.push(category);
    clauses.push(`category = $${values.length}`);
  }
  if (activeOnly) clauses.push("status = 'active'");
  else if (status) {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

export async function count(filters, activeOnly) {
  const { where, values } = buildFilters(filters, activeOnly);
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM translations ${where}`, values);
  return rows[0].total;
}

export async function findAll(filters, { limit, offset, activeOnly }) {
  const { where, values } = buildFilters(filters, activeOnly);
  values.push(limit, offset);
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM translations ${where}
     ORDER BY word ASC, id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return rows.map(toDto);
}

export async function findById(id, activeOnly = false) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM translations WHERE id = $1${activeOnly ? " AND status = 'active'" : ""} LIMIT 1`,
    [id],
  );
  return toDto(rows[0]);
}

export async function findExact(normalizedWord) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM translations
     WHERE status = 'active' AND (normalized_word = $1 OR $1 = ANY(aliases)) LIMIT 1`,
    [normalizedWord],
  );
  return toDto(rows[0]);
}

export async function listCategories(activeOnly = true) {
  const { rows } = await query(
    `SELECT category, COUNT(*)::int AS count FROM translations
     ${activeOnly ? "WHERE status = 'active'" : ""}
     GROUP BY category ORDER BY category`,
  );
  return rows.map((row) => ({ category: row.category, count: row.count }));
}

export async function create(data) {
  const { rows } = await query(
    `INSERT INTO translations
      (word, normalized_word, translation, description, category, status, sign_image, sign_video, aliases)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLUMNS}`,
    [data.word, data.normalizedWord, data.translation, data.description, data.category,
      data.status, data.signImage, data.signVideo, data.aliases],
  );
  return toDto(rows[0]);
}

export async function update(id, data) {
  const columnMap = {
    word: "word", normalizedWord: "normalized_word", translation: "translation",
    description: "description", category: "category", status: "status",
    signImage: "sign_image", signVideo: "sign_video", aliases: "aliases",
  };
  const values = [id];
  const sets = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }
  const { rows } = await query(
    `UPDATE translations SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
    values,
  );
  return toDto(rows[0]);
}

export async function remove(id) {
  const { rowCount } = await query("DELETE FROM translations WHERE id = $1", [id]);
  return rowCount > 0;
}
