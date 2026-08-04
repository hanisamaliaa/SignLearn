import { ApiError } from "../utils/ApiError.js";

/**
 * Course service — architecture only. Database queries are not implemented yet.
 */

export async function getAllCourses() {
  throw new ApiError(501, "List courses is not implemented yet.");
}

export async function getCourseById(courseId) {
  throw new ApiError(501, `Get course ${courseId} is not implemented yet.`);
}

export async function createCourse() {
  throw new ApiError(501, "Create course is not implemented yet.");
}

export async function updateCourse(courseId) {
  throw new ApiError(501, `Update course ${courseId} is not implemented yet.`);
}

export async function deleteCourse(courseId) {
  throw new ApiError(501, `Delete course ${courseId} is not implemented yet.`);
}
