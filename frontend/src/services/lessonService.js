import { request } from "./api";

/** Lessons — API Contract §8.6-8.9. */

export async function getLessons(courseId, params = {}) {
  return request({ url: `/courses/${courseId}/lessons`, params });
}

export async function getLessonById(courseId, lessonId) {
  return request({ url: `/courses/${courseId}/lessons/${lessonId}` });
}

export async function createLesson(courseId, data) {
  const payload = await request({ method: "post", url: `/courses/${courseId}/lessons`, data });
  return payload.lesson;
}

export async function updateLesson(courseId, lessonId, data) {
  const payload = await request({
    method: "put", url: `/courses/${courseId}/lessons/${lessonId}`, data,
  });
  return payload.lesson;
}

export async function deleteLesson(courseId, lessonId) {
  return request({ method: "delete", url: `/courses/${courseId}/lessons/${lessonId}` });
}

/** Daftar `order` WAJIB memuat seluruh id pelajaran kursus itu (§8.9). */
export async function reorderLessons(courseId, order) {
  const payload = await request({
    method: "patch", url: `/courses/${courseId}/lessons/reorder`, data: { order },
  });
  return payload.items;
}
