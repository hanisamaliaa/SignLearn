import { asyncHandler } from "../utils/asyncHandler.js";
import { success, created } from "../utils/apiResponse.js";

export const getAllCourses = asyncHandler(async (req, res) => {
  success(res, null, "List courses — not implemented yet.");
});

export const getCourseById = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Get course ${req.params.courseId} — not implemented yet.`,
  );
});

export const createCourse = asyncHandler(async (req, res) => {
  created(res, null, "Create course — not implemented yet.");
});

export const updateCourse = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Update course ${req.params.courseId} — not implemented yet.`,
  );
});

export const deleteCourse = asyncHandler(async (req, res) => {
  success(
    res,
    null,
    `Delete course ${req.params.courseId} — not implemented yet.`,
  );
});
