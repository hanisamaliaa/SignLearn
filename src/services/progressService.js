import { request } from "./api";

export async function getUserProgress() {
  return request({
    method: "get",
    url: "/progress",
    mockData: {
      success: true,
      progress: {
        coursesCompleted: 1,
        lessonsCompleted: 6,
        quizzesTaken: 8,
        avgScore: 82,
      },
    },
  });
}

export async function updateLessonProgress(lessonId, payload) {
  return request({
    method: "put",
    url: `/progress/lessons/${lessonId}`,
    data: payload,
    mockData: {
      success: true,
      progress: { lessonId, ...payload },
    },
  });
}

export async function getDashboardData() {
  return request({
    method: "get",
    url: "/dashboard",
    mockData: {
      success: true,
      dashboard: {
        currentCourse: null,
        quizHistory: [],
        recentActivities: [],
      },
    },
  });
}
