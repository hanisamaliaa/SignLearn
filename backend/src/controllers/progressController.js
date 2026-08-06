import * as progressService from "../services/progressService.js";

export async function completeLesson(req, res, next) {
  try {
    const { lesson_id } = req.body;

    // sementara hardcode sampai auth selesai
    const userId = 1;

    const progress = await progressService.completeLesson(userId, lesson_id);

    res.status(201).json({
      success: true,
      message: "Lesson completed",
      data: progress,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserProgress(req, res, next) {
  try {
    const userId = 1;

    const progress = await progressService.getUserProgress(userId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (err) {
    next(err);
  }
}
