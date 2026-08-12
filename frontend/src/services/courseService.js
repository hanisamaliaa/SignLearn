import { request } from "./api";

/** Courses — API Contract §8.1-8.5. */

export async function getCourses(params = {}) {
  return request({ url: "/courses", params });
}

/** Detail kursus: course + lessons + quizzes dalam satu request. */
export async function getCourseById(courseId) {
  return request({ url: `/courses/${courseId}` });
}

export async function getCategories() {
  const payload = await request({ url: "/courses/categories" });
  return payload.items;
}

export async function createCourse(data) {
  const payload = await request({ method: "post", url: "/courses", data });
  return payload.course;
}

export async function updateCourse(courseId, data) {
  const payload = await request({ method: "put", url: `/courses/${courseId}`, data });
  return payload.course;
}

export async function deleteCourse(courseId) {
  return request({ method: "delete", url: `/courses/${courseId}` });
}
