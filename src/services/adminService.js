import { request } from "./api";

export async function getAdminDashboard() {
  return request({
    method: "get",
    url: "/admin/dashboard",
    mockData: {
      success: true,
      metrics: {
        users: 12,
        courses: 4,
        quizzes: 6,
      },
    },
  });
}

export async function getAdminReports() {
  return request({
    method: "get",
    url: "/admin/reports",
    mockData: {
      success: true,
      reports: [{ id: "r1", title: "Weekly activity" }],
    },
  });
}

export async function getAdminUsers() {
  return request({
    method: "get",
    url: "/admin/users",
    mockData: { success: true, users: [] },
  });
}

export async function manageUser(userId, payload) {
  return request({
    method: "put",
    url: `/admin/users/${userId}`,
    data: payload,
    mockData: { success: true, user: { id: userId, ...payload } },
  });
}
