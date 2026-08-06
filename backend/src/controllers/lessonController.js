import * as lessonService from "../services/lessonService.js";
import * as courseService from "../services/courseService.js";

export const getAllLessons = async (req, res, next) => {
  try {
    const lessons = await lessonService.getAllLessons();

    return res.status(200).json({
      success: true,
      message: "Lessons retrieved successfully",
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
};

export async function getLessonsByCourse(req, res, next) {
  try {
    const course = await courseService.getCourseById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        status: 404,
        code: "NOT_FOUND",
        message: "Course not found",
      });
    }

    const lessons = await lessonService.getLessonsByCourse(req.params.courseId);

    return res.status(200).json({
      success: true,
      message: "Lessons retrieved successfully",
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLessonById(req, res, next) {
  try {
    const lesson = await lessonService.getLessonById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        status: 404,
        code: "NOT_FOUND",
        message: "Lesson not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lesson retrieved successfully",
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
}

export async function createLesson(req, res, next) {
  try {
    // Pastikan course ada
    const course = await courseService.getCourseById(req.body.course_id);

    if (!course) {
      return res.status(404).json({
        success: false,
        status: 404,
        code: "NOT_FOUND",
        message: "Course not found",
      });
    }

    const lesson = await lessonService.createLesson(req.body);

    return res.status(201).json({
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
    // Pastikan lesson ada
    const existingLesson = await lessonService.getLessonById(req.params.id);

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        status: 404,
        code: "NOT_FOUND",
        message: "Lesson not found",
      });
    }

    // Jika course_id dikirim, pastikan course ada
    if (req.body.course_id) {
      const course = await courseService.getCourseById(req.body.course_id);

      if (!course) {
        return res.status(404).json({
          success: false,
          status: 404,
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
    }

    const lesson = await lessonService.updateLesson(req.params.id, req.body);

    return res.status(200).json({
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
    // Pastikan lesson ada
    const existingLesson = await lessonService.getLessonById(req.params.id);

    if (!existingLesson) {
      return res.status(404).json({
        success: false,
        status: 404,
        code: "NOT_FOUND",
        message: "Lesson not found",
      });
    }

    await lessonService.deleteLesson(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
