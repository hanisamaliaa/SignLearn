import { request } from "./api";

export async function getLessons(courseId) {
  return request({
    method: "get",
    url: `/courses/${courseId}/lessons`,
    mockData: {
      success: true,
      lessons: [
        {
          id: "l1",
          courseId,
          title: "Pengenalan Huruf",
          duration: "10 min",
        },
      ],
    },
  });
}

export async function getLessonById(courseId, lessonId) {
  return request({
    method: "get",
    url: `/courses/${courseId}/lessons/${lessonId}`,
    mockData: {
      success: true,
      lesson: {
        id: lessonId,
        courseId,
        title: "Pengenalan Huruf",
        content: "Konten pelajaran akan datang dari backend.",
      },
    },
  });
}

export async function createLesson(courseId, payload) {
  return request({
    method: "post",
    url: `/courses/${courseId}/lessons`,
    data: payload,
    mockData: { success: true, lesson: { id: "l2", courseId, ...payload } },
  });
}

export async function updateLesson(courseId, lessonId, payload) {
  return request({
    method: "put",
    url: `/courses/${courseId}/lessons/${lessonId}`,
    data: payload,
    mockData: { success: true, lesson: { id: lessonId, courseId, ...payload } },
  });
}

export async function deleteLesson(courseId, lessonId) {
  return request({
    method: "delete",
    url: `/courses/${courseId}/lessons/${lessonId}`,
    mockData: { success: true, message: "Lesson deleted" },
  });
}
