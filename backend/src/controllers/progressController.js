import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

export const getUserProgress = asyncHandler(async (req, res) => {
  success(res, null, "Get user progress — not implemented yet.");
});

export const updateLessonProgress = asyncHandler(async (req, res) => {
  success(res, null, "Update lesson progress — not implemented yet.");
});
