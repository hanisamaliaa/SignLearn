import { ApiError } from "../utils/ApiError.js";

/**
 * Progress service — architecture only. Database queries are not implemented yet.
 *
 * Business rules:
 * - Sequential course lock: a lesson is only unlocked when the previous one
 *   is completed and its quiz is passed (>= 70).
 * - Learning progress is tracked per user per lesson.
 */

export async function getUserProgress(userId) {
  throw new ApiError(
    501,
    `Get progress for user ${userId} is not implemented yet.`,
  );
}

export async function updateLessonProgress(userId, lessonId, payload) {
  throw new ApiError(
    501,
    `Update lesson progress ${lessonId} is not implemented yet.`,
  );
}

export async function isLessonUnlocked(userId, lessonId) {
  throw new ApiError(
    501,
    `Check lesson ${lessonId} unlock status is not implemented yet.`,
  );
}
