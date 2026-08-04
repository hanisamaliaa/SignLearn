import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/apiResponse.js";

/**
 * AI controller — placeholder for AI subtitle & quiz generation.
 */
export const generateSubtitles = asyncHandler(async (req, res) => {
  success(res, null, "AI subtitle generation — not implemented yet.");
});

export const generateQuiz = asyncHandler(async (req, res) => {
  success(res, null, "AI quiz generation — not implemented yet.");
});
