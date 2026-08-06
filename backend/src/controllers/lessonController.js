import * as lessonService from "../services/lessonService.js";

export async function getLessonsByCourse(req, res, next) {
  try {
    const lessons = await lessonService.getLessonsByCourse(req.params.courseId);

    res.json({
      success: true,
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLessonById(req, res, next) {
  try {
    const lesson = await lessonService.getLessonById(req.params.id);

    res.json({
      success: true,
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

export async function createLesson(req, res, next) {
  try {
    const lesson = await lessonService.createLesson(req.body);

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateLesson(req, res, next) {
  try {
    const lesson = await lessonService.updateLesson(req.params.id, req.body);

    res.json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteLesson(req, res, next) {
  try {
    await lessonService.deleteLesson(req.params.id);

    res.json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
