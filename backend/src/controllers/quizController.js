import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";

export const getQuizzesByCourse = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `List quizzes for course ${req.params.courseId} — not implemented yet.`,
  );
});

export const getQuizById = asyncHandler(async (req, res) => {
  success(res, null, `Get quiz ${req.params.quizId} — not implemented yet.`);
});

export const submitQuiz = asyncHandler(async (req, res) => {
  success(res, null, `Submit quiz ${req.params.quizId} — not implemented yet.`);
});

export const createQuiz = asyncHandler(async (req, res) => {
  created(res, null, "Create quiz — not implemented yet.");
});

export const updateQuiz = asyncHandler(async (req, res) => {
  success(res, null, `Update quiz ${req.params.quizId} — not implemented yet.`);
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  success(res, null, `Delete quiz ${req.params.quizId} — not implemented yet.`);
});
