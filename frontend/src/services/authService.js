import { request } from "./api";

export async function login(credentials) {
  return request({
    method: "post",
    url: "/auth/login",
    data: credentials,
    mockData: {
      success: true,
      token: "mock-access-token",
      user: {
        id: "u1",
        name: "Budi Santoso",
        email: credentials.email,
        role: "user",
      },
    },
  });
}

export async function register(payload) {
  return request({
    method: "post",
    url: "/auth/register",
    data: payload,
    mockData: {
      success: true,
      message: "Registration queued",
      user: {
        id: "u2",
        name: payload.name,
        email: payload.email,
        role: "user",
      },
    },
  });
}

export async function logout() {
  return request({
    method: "post",
    url: "/auth/logout",
    mockData: { success: true, message: "Logged out" },
  });
}

export async function getCurrentUser() {
  return request({
    method: "get",
    url: "/auth/me",
    mockData: {
      success: true,
      user: {
        id: "u1",
        name: "Budi Santoso",
        email: "budi@example.com",
        role: "user",
      },
    },
  });
}

export async function requestPasswordReset(email) {
  return request({
    method: "post",
    url: "/auth/forgot-password",
    data: { email },
    mockData: { success: true, message: "Reset link sent" },
  });
}

export async function resetPassword(payload) {
  return request({
    method: "post",
    url: "/auth/reset-password",
    data: payload,
    mockData: { success: true, message: "Password updated" },
  });
}
