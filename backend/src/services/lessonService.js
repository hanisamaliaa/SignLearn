import { ApiError } from "../utils/ApiError.js";

/**
 * Lesson service — architecture only. Database queries are not implemented yet.
 */

export async function getLessonsByCourse(courseId) {
  throw new ApiError(
    501,
    `List lessons for course ${courseId} is not implemented yet.`,
  );
}

export async function getLessonById(courseId, lessonId) {
  throw new ApiError(501, `Get lesson ${lessonId} is not implemented yet.`);
}

export async function createLesson(courseId) {
  throw new ApiError(
    501,
    `Create lesson for course ${courseId} is not implemented yet.`,
  );
}

export async function updateLesson(courseId, lessonId) {
  throw new ApiError(501, `Update lesson ${lessonId} is not implemented yet.`);
}

export async function deleteLesson(courseId, lessonId) {
  throw new ApiError(501, `Delete lesson ${lessonId} is not implemented yet.`);
}
