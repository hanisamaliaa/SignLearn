import * as courseService from "../services/courseService.js";

export async function getAllCourses(req, res, next) {
  try {
    const courses = await courseService.getAllCourses();

    res.status(200).json({
      success: true,
      message: "Courses retrieved successfully",
      data: courses,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCourseById(req, res, next) {
  try {
    const course = await courseService.getCourseById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await courseService.createCourse(req.body);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    await courseService.deleteCourse(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
