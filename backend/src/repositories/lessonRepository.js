import { query } from "../config/database.js";

export async function getAllLessons() {
  const { rows } = await query(
    `
    SELECT
      id,
      course_id,
      title,
      description,
      video_url,
      sort_order,
      created_at,
      updated_at
    FROM lessons
    ORDER BY sort_order ASC;
    `,
  );

  return rows;
}

export async function findByCourseId(courseId) {
  const { rows } = await query(
    `
    SELECT
      id,
      course_id,
      title,
      description,
      video_url,
      sort_order,
      created_at,
      updated_at
    FROM lessons
    WHERE course_id = $1
    ORDER BY sort_order ASC;
    `,
    [courseId],
  );

  return rows;
}

export async function findById(id) {
  const { rows } = await query(
    `
    SELECT
      id,
      course_id,
      title,
      description,
      video_url,
      sort_order,
      created_at,
      updated_at
    FROM lessons
    WHERE id = $1;
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function create(lesson) {
  const { rows } = await query(
    `
    INSERT INTO lessons
    (
      course_id,
      title,
      description,
      video_url,
      sort_order
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      course_id,
      title,
      description,
      video_url,
      sort_order,
      created_at,
      updated_at;
    `,
    [
      lesson.course_id,
      lesson.title,
      lesson.description,
      lesson.video_url,
      lesson.sort_order,
    ],
  );

  return rows[0];
}

export async function update(id, lesson) {
  const { rows } = await query(
    `
    UPDATE lessons
    SET
      course_id = $1,
      title = $2,
      description = $3,
      video_url = $4,
      sort_order = $5,
      updated_at = NOW()
    WHERE id = $6
    RETURNING
      id,
      course_id,
      title,
      description,
      video_url,
      sort_order,
      created_at,
      updated_at;
    `,
    [
      lesson.course_id,
      lesson.title,
      lesson.description,
      lesson.video_url,
      lesson.sort_order,
      id,
    ],
  );

  return rows[0] ?? null;
}

export async function remove(id) {
  const { rowCount } = await query(
    `
    DELETE FROM lessons
    WHERE id = $1;
    `,
    [id],
  );

  return rowCount > 0;
}
