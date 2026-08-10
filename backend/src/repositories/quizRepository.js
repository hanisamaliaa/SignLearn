import { query, withTransaction } from "../config/database.js";

/**
 * Repository kuis dan pertanyaan.
 *
 * Satu-satunya lapisan yang mengetahui nama kolom SQL; service bekerja
 * dengan objek camelCase (API Contract §2.5).
 */

const QUIZ_COLUMNS = `
  id, course_id, lesson_id, title, total_questions,
  min_passing_score, duration_seconds, created_at, updated_at
`;

export function toQuizDto(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    lessonId: row.lesson_id ? String(row.lesson_id) : null,
    title: row.title,
    totalQuestions: Number(row.total_questions),
    minPassingScore: Number(row.min_passing_score),
    durationSeconds: Number(row.duration_seconds),
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

/**
 * Memetakan pertanyaan ke DTO.
 *
 * ⚠ `includeAnswer` menentukan apakah `correctIndex` ikut. Ia HANYA boleh
 * true untuk peran admin. Kunci jawaban di respons berarti kuis dapat
 * diselesaikan dari DevTools tanpa menonton satu pelajaran pun — dan itu
 * membuat seluruh mekanisme KKM tidak bermakna (API Contract §5.5).
 */
export function toQuestionDto(row, includeAnswer = false) {
  if (!row) return null;
  const dto = {
    id: String(row.id),
    quizId: String(row.quiz_id),
    question: row.question,
    questionType: row.question_type,
    options: Array.isArray(row.options) ? row.options : [],
    sortOrder: Number(row.sort_order),
  };
  if (includeAnswer) dto.correctIndex = Number(row.correct_index);
  return dto;
}

// ─── Kuis: baca ──────────────────────────────────────────────────────────

export async function findByCourse(courseId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${QUIZ_COLUMNS} FROM quizzes
      WHERE course_id = $1 ORDER BY id ASC LIMIT $2 OFFSET $3`,
    [courseId, limit, offset],
  );
  return rows.map(toQuizDto);
}

export async function countByCourse(courseId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM quizzes WHERE course_id = $1`,
    [courseId],
  );
  return rows[0].total;
}

/**
 * Daftar kuis beserta ringkasan percobaan satu pengguna.
 *
 * Agregasi dilakukan dalam satu query, bukan N+1 per kuis.
 */
export async function findByCourseWithAttempts(courseId, userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT ${QUIZ_COLUMNS.split(",").map((c) => `q.${c.trim()}`).join(", ")},
            a.best_score, a.attempt_count, a.ever_passed, a.last_taken
       FROM quizzes q
       LEFT JOIN (
         SELECT quiz_id,
                MAX(score)::int              AS best_score,
                COUNT(*)::int                AS attempt_count,
                BOOL_OR(passed)              AS ever_passed,
                MAX(taken_at)                AS last_taken
           FROM quiz_results WHERE user_id = $2
          GROUP BY quiz_id
       ) a ON a.quiz_id = q.id
      WHERE q.course_id = $1
      ORDER BY q.id ASC LIMIT $3 OFFSET $4`,
    [courseId, userId, limit, offset],
  );

  return rows.map((row) => ({
    ...toQuizDto(row),
    attempt: row.attempt_count
      ? {
          bestScore: Number(row.best_score),
          attemptCount: Number(row.attempt_count),
          passed: row.ever_passed,
          lastTakenAt: row.last_taken?.toISOString() ?? null,
        }
      : null,
  }));
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${QUIZ_COLUMNS} FROM quizzes WHERE id = $1 LIMIT 1`,
    [id],
  );
  return toQuizDto(rows[0]);
}

// ─── Pertanyaan: baca ────────────────────────────────────────────────────

export async function findQuestions(quizId, includeAnswer = false) {
  const { rows } = await query(
    `SELECT id, quiz_id, question, question_type, options, correct_index, sort_order
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC, id ASC`,
    [quizId],
  );
  return rows.map((r) => toQuestionDto(r, includeAnswer));
}

/**
 * Kunci jawaban saja — untuk penilaian di server.
 *
 * Dipisahkan dari `findQuestions` agar jalur penilaian tidak pernah
 * bergantung pada flag boolean yang bisa salah dilewatkan.
 */
export async function findAnswerKey(quizId) {
  const { rows } = await query(
    `SELECT id, correct_index, jsonb_array_length(options) AS option_count
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC, id ASC`,
    [quizId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    correctIndex: Number(r.correct_index),
    optionCount: Number(r.option_count),
  }));
}

export async function findQuestionById(id) {
  const { rows } = await query(
    `SELECT id, quiz_id, question, question_type, options, correct_index, sort_order
       FROM quiz_questions WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toQuestionDto(rows[0], true) : null;
}

// ─── Kuis: tulis ─────────────────────────────────────────────────────────

export async function create(courseId, data) {
  const { rows } = await query(
    `INSERT INTO quizzes (course_id, lesson_id, title, min_passing_score, duration_seconds)
     VALUES ($1, $2, $3, COALESCE($4, 70), COALESCE($5, 300))
     RETURNING ${QUIZ_COLUMNS}`,
    [
      courseId,
      data.lessonId ?? null,
      data.title.trim(),
      data.minPassingScore ?? null,
      data.durationSeconds ?? null,
    ],
  );
  return toQuizDto(rows[0]);
}

export async function update(id, data) {
  const columnMap = {
    title: "title",
    lessonId: "lesson_id",
    minPassingScore: "min_passing_score",
    durationSeconds: "duration_seconds",
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
    `UPDATE quizzes SET ${sets.join(", ")} WHERE id = $1 RETURNING ${QUIZ_COLUMNS}`,
    values,
  );
  return toQuizDto(rows[0]);
}

export async function remove(id) {
  const { rowCount } = await query(`DELETE FROM quizzes WHERE id = $1`, [id]);
  return rowCount > 0;
}

export async function hasResults(quizId) {
  const { rows } = await query(
    `SELECT 1 FROM quiz_results WHERE quiz_id = $1 LIMIT 1`,
    [quizId],
  );
  return rows.length > 0;
}

// ─── Pertanyaan: tulis ───────────────────────────────────────────────────

/** Membuat pertanyaan dan menyelaraskan `quizzes.total_questions`. */
export async function createQuestion(quizId, data) {
  return withTransaction(async (client) => {
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const { rows } = await client.query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM quiz_questions WHERE quiz_id = $1`,
        [quizId],
      );
      sortOrder = rows[0].next;
    }

    const { rows } = await client.query(
      `INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_index, sort_order)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING id, quiz_id, question, question_type, options, correct_index, sort_order`,
      [
        quizId,
        String(data.question).trim(),
        data.questionType ?? "multiple-choice",
        JSON.stringify(data.options),
        data.correctIndex,
        sortOrder,
      ],
    );

    await client.query(
      `UPDATE quizzes SET total_questions = (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = $1)
        WHERE id = $1`,
      [quizId],
    );

    return toQuestionDto(rows[0], true);
  });
}

export async function updateQuestion(id, data) {
  const columnMap = {
    question: "question",
    questionType: "question_type",
    correctIndex: "correct_index",
    sortOrder: "sort_order",
  };

  const sets = [];
  const values = [id];

  for (const [key, column] of Object.entries(columnMap)) {
    if (data[key] !== undefined) {
      values.push(key === "question" ? String(data[key]).trim() : data[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }
  if (data.options !== undefined) {
    values.push(JSON.stringify(data.options));
    sets.push(`options = $${values.length}::jsonb`);
  }

  if (sets.length === 0) return findQuestionById(id);

  const { rows } = await query(
    `UPDATE quiz_questions SET ${sets.join(", ")} WHERE id = $1
     RETURNING id, quiz_id, question, question_type, options, correct_index, sort_order`,
    values,
  );
  return rows[0] ? toQuestionDto(rows[0], true) : null;
}

export async function removeQuestion(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `DELETE FROM quiz_questions WHERE id = $1 RETURNING quiz_id`,
      [id],
    );
    if (!rows[0]) return false;

    await client.query(
      `UPDATE quizzes SET total_questions = (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = $1)
        WHERE id = $1`,
      [rows[0].quiz_id],
    );
    return true;
  });
}

export async function reorderQuestions(quizId, orderedIds) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM quiz_questions WHERE quiz_id = $1`,
      [quizId],
    );
    const existing = rows.map((r) => String(r.id)).sort();
    const incoming = orderedIds.map(String).sort();

    if (existing.length !== incoming.length || existing.some((v, i) => v !== incoming[i])) {
      const error = new Error("INCOMPLETE_ORDER");
      error.code = "INCOMPLETE_ORDER";
      throw error;
    }

    for (const [index, questionId] of orderedIds.entries()) {
      await client.query(
        `UPDATE quiz_questions SET sort_order = $2 WHERE id = $1 AND quiz_id = $3`,
        [questionId, index + 1, quizId],
      );
    }

    const { rows: updated } = await client.query(
      `SELECT id, quiz_id, question, question_type, options, correct_index, sort_order
         FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC`,
      [quizId],
    );
    return updated.map((r) => toQuestionDto(r, true));
  });
}

// ─── Hasil ───────────────────────────────────────────────────────────────

export async function saveResult({ userId, quizId, score, passed, answers }) {
  const { rows } = await query(
    `INSERT INTO quiz_results (user_id, quiz_id, score, passed, answers)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, quiz_id, score, passed, taken_at`,
    [userId, quizId, score, passed, JSON.stringify(answers)],
  );
  const r = rows[0];
  return {
    id: String(r.id),
    quizId: String(r.quiz_id),
    score: Number(r.score),
    passed: r.passed,
    takenAt: r.taken_at.toISOString(),
  };
}

export async function findBestAttempt(quizId, userId) {
  const { rows } = await query(
    `SELECT MAX(score)::int AS best_score, COUNT(*)::int AS attempt_count,
            BOOL_OR(passed) AS ever_passed
       FROM quiz_results WHERE quiz_id = $1 AND user_id = $2`,
    [quizId, userId],
  );
  if (!rows[0] || rows[0].attempt_count === 0) return null;
  return {
    bestScore: Number(rows[0].best_score),
    attemptCount: Number(rows[0].attempt_count),
    passed: rows[0].ever_passed,
  };
}
