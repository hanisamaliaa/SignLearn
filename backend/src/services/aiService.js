import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

/**
 * AI feature placeholders.
 *
 * These are intentionally NOT implemented. They reserve the integration
 * points for future AI subtitle generation and AI quiz generation.
 */

export async function generateSubtitles(lessonId) {
  if (!env.ai.subtitleEnabled) {
    throw new ApiError(501, "AI subtitle generation is not enabled yet.");
  }
  throw new ApiError(
    501,
    `Generate subtitles for lesson ${lessonId} is not implemented yet.`,
  );
}

export async function generateQuiz(lessonId) {
  if (!env.ai.quizGeneratorEnabled) {
    throw new ApiError(501, "AI quiz generation is not enabled yet.");
  }
  throw new ApiError(
    501,
    `Generate quiz for lesson ${lessonId} is not implemented yet.`,
  );
}
