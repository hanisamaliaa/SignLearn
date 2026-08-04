import { ApiError } from "../utils/ApiError.js";

/**
 * Quiz service — architecture only. Database queries are not implemented yet.
 *
 * Business rule: minimum passing score is 70 (KKM).
 */
export const MIN_PASSING_SCORE = 70;

export function isPassing(score) {
  return score >= MIN_PASSING_SCORE;
}

export async function getQuizzesByCourse(courseId) {
  throw new ApiError(
    501,
    `List quizzes for course ${courseId} is not implemented yet.`,
  );
}

export async function getQuizById(courseId, quizId) {
  throw new ApiError(501, `Get quiz ${quizId} is not implemented yet.`);
}

export async function submitQuiz(courseId, quizId, answers) {
  throw new ApiError(501, `Submit quiz ${quizId} is not implemented yet.`);
}

export async function createQuiz(courseId) {
  throw new ApiError(
    501,
    `Create quiz for course ${courseId} is not implemented yet.`,
  );
}

export async function updateQuiz(courseId, quizId) {
  throw new ApiError(501, `Update quiz ${quizId} is not implemented yet.`);
}

export async function deleteQuiz(courseId, quizId) {
  throw new ApiError(501, `Delete quiz ${quizId} is not implemented yet.`);
}
