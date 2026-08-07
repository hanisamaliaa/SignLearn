import * as progressRepository from "../repositories/progressRepository.js";

export async function completeLesson(userId, lessonId) {
  return await progressRepository.saveProgress({
    user_id: userId,
    lesson_id: lessonId,
    status: "completed",
    completed_at: new Date().toISOString(),
  });
}

export async function getUserProgress(userId) {
  return await progressRepository.findByUser(userId);
}
