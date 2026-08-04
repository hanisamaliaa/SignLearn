import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";

export const getLessonsByCourse = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `List lessons for course ${req.params.courseId} — not implemented yet.`,
  );
});

export const getLessonById = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Get lesson ${req.params.lessonId} — not implemented yet.`,
  );
});

export const createLesson = asyncHandler(async (req, res) => {
  created(res, null, "Create lesson — not implemented yet.");
});

export const updateLesson = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Update lesson ${req.params.lessonId} — not implemented yet.`,
  );
});

export const deleteLesson = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Delete lesson ${req.params.lessonId} — not implemented yet.`,
  );
});
