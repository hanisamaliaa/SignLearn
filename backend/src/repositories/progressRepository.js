/**
 * Progress repository — MySQL data layer. Queries are NOT implemented yet.
 */

export async function getUserProgress(userId) {
  throw new Error("getUserProgress not implemented");
}

export async function upsertLessonProgress(userId, lessonId, fields) {
  throw new Error("upsertLessonProgress not implemented");
}

export async function isLessonCompleted(userId, lessonId) {
  throw new Error("isLessonCompleted not implemented");
}
