import axios from "axios";
import { getItem } from "../utils/storage";
import { STORAGE_KEYS, API_DEFAULT_BASE_URL } from "../constants/app";

const env = import.meta.env;

export const API_BASE_URL = env.VITE_API_BASE_URL || API_DEFAULT_BASE_URL;
export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS || 10000);
export const API_MOCK_MODE = env.VITE_API_MOCK_MODE === "true";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage to every request.
apiClient.interceptors.request.use((config) => {
  const token = getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(normalizeError(error));
  },
);

export function normalizeError(error) {
  if (error?.response?.data) {
    return error.response.data;
  }
  return {
    message: error?.message || "Unexpected API error",
    status: error?.response?.status || 500,
  };
}

/**
 * Unified request helper. When API_MOCK_MODE is enabled it returns the
 * provided mockData instead of hitting the network.
 */
export async function request({
  method = "get",
  url = "/",
  data = null,
  params = null,
  headers = {},
  mockData = null,
}) {
  if (API_MOCK_MODE) {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return mockData ?? { success: true, data: null, message: "Mock response" };
  }

  try {
    const response = await apiClient.request({
      method,
      url,
      data,
      params,
      headers,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export { apiClient };
