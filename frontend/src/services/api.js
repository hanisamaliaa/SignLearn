import axios from "axios";
import { API_DEFAULT_BASE_URL } from "../constants/app";

/**
 * Klien HTTP — satu-satunya lapisan yang berbicara ke backend SignLearn.
 *
 * Catatan: layanan AI BISINDO punya kliennya sendiri
 * (`bisindoRecognitionService.js`) karena ia berjalan di origin berbeda
 * (proxy `/bisindo-ai` → 127.0.0.1:8000) dan tidak memakai sesi SignLearn.
 *
 * ── Kenapa access token disimpan DI MEMORI, bukan localStorage ────────
 *
 * Versi sebelumnya membaca token dari `localStorage`. Apa pun di sana dapat
 * dibaca JavaScript mana pun yang berjalan di halaman — termasuk skrip pihak
 * ketiga dan payload XSS. Satu kerentanan XSS langsung berarti pencurian sesi.
 *
 *   access token   → variabel modul di bawah. Hilang saat tab ditutup atau
 *                    halaman dimuat ulang.
 *   refresh token  → cookie HttpOnly `slr_rt`, dikelola browser. JavaScript
 *                    TIDAK DAPAT membacanya sama sekali.
 *
 * Konsekuensinya: setelah reload, token di memori hilang — dan itu disengaja.
 * `bootstrapSession()` memulihkannya diam-diam lewat cookie.
 */

const env = import.meta.env;

export const API_BASE_URL = env.VITE_API_BASE_URL || API_DEFAULT_BASE_URL;
export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS || 10000);

/**
 * Mode mock — jaring pengaman demo, MATI secara bawaan.
 *
 * Dipertahankan supaya presentasi tetap berjalan bila jaringan atau database
 * mati. Jangan dinyalakan saat pengembangan: ia menyembunyikan setiap
 * kesalahan integrasi di balik data palsu yang selalu berhasil.
 */
export const API_MOCK_MODE = env.VITE_API_MOCK_MODE === "true";

// ─── Token di memori ─────────────────────────────────────────────────────

let accessToken = null;
let onSessionExpired = () => {};

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

export function onAuthFailure(handler) {
  onSessionExpired = typeof handler === "function" ? handler : () => {};
}

// ─── Klien ───────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },

  /**
   * WAJIB. Tanpa ini browser tidak mengirim cookie `slr_rt`, sehingga
   * `POST /auth/refresh` selalu gagal `TOKEN_MISSING` dan pengguna terlempar
   * ke halaman masuk setiap 15 menit.
   */
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/**
 * Satu refresh untuk banyak request — "single flight".
 *
 * Halaman dashboard menembak beberapa request sekaligus. Ketika token
 * kedaluwarsa, SEMUANYA menerima 401 hampir bersamaan. Tanpa penguncian ini
 * masing-masing memanggil `/auth/refresh` sendiri.
 *
 * Itu bukan sekadar boros: refresh token DIROTASI setiap pemakaian, dan
 * backend memperlakukan pemakaian token yang sudah dirotasi sebagai PENCURIAN
 * — seluruh rantai sesi dicabut. Refresh paralel akan me-logout pengguna
 * justru karena aplikasinya bekerja normal.
 */
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then((response) => {
        const token = response.data?.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;

    const canRetry =
      status === 401 &&
      original &&
      !original._retried &&
      // Jangan pernah me-refresh permintaan refresh itu sendiri.
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login");

    /**
     * Hanya `TOKEN_EXPIRED` dan `TOKEN_MISSING` yang layak di-refresh.
     *
     * `TOKEN_INVALID` berarti token rusak atau dipalsukan; `TOKEN_REUSED`
     * berarti backend baru saja mencabut seluruh rantai sesi karena mendeteksi
     * pencurian. Me-refresh keduanya hanya menghasilkan 401 kedua — dan pada
     * TOKEN_REUSED, memperpanjang keadaan yang justru ingin dihentikan.
     */
    if (canRetry && (code === "TOKEN_EXPIRED" || code === "TOKEN_MISSING")) {
      original._retried = true;
      try {
        const token = await refreshSession();
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return apiClient.request(original);
        }
      } catch {
        // Refresh gagal — sesi benar-benar habis.
      }
      clearAccessToken();
      onSessionExpired();
    }

    return Promise.reject(normalizeError(error));
  },
);

/**
 * Menyeragamkan error menjadi bentuk envelope kontrak §2.3.
 *
 * Pemanggil selalu menerima `{ status, code, message, errors? }`, baik error
 * berasal dari backend, jaringan, maupun timeout.
 */
export function normalizeError(error) {
  if (error?.code && error?.status && error?.message) return error;
  if (error?.response?.data?.code) return error.response.data;

  if (error?.response?.data) {
    return {
      status: error.response.status,
      code: "INTERNAL",
      message: error.response.data.message || "Terjadi kesalahan pada server.",
    };
  }

  if (error?.code === "ECONNABORTED") {
    return { status: 408, code: "TIMEOUT", message: "Permintaan terlalu lama. Coba lagi." };
  }

  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
  };
}

/**
 * Mengembalikan `data` dari envelope, bukan seluruh respons.
 *
 * Kontrak §2.2 menjamin setiap 2xx berbentuk `{ success, message, data }`.
 * Membuka bungkusnya di sini berarti tidak ada pemanggil yang perlu menulis
 * `.data.data` — pola yang selalu berakhir salah di satu tempat.
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
    return mockData ?? null;
  }

  const response = await apiClient.request({ method, url, data, params, headers });
  return response.data?.data ?? null;
}

/**
 * Memulihkan sesi saat aplikasi dimuat.
 *
 * Token di memori hilang setiap reload; cookie refresh tidak. Fungsi ini
 * menukarnya menjadi access token baru sebelum UI dirender, sehingga pengguna
 * tidak terlempar ke halaman masuk hanya karena menekan F5.
 *
 * @returns {Promise<object|null>} user bila sesi pulih, `null` bila tidak
 */
export async function bootstrapSession() {
  if (API_MOCK_MODE) return null;

  try {
    const response = await apiClient.post("/auth/refresh");
    const payload = response.data?.data;
    setAccessToken(payload?.accessToken ?? null);
    return payload?.user ?? null;
  } catch {
    // Tidak ada cookie, atau sudah kedaluwarsa. Tamu — bukan error.
    clearAccessToken();
    return null;
  }
}

export { apiClient };
