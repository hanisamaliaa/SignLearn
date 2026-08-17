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

/**
 * Peringatan sekali di konsol saat mode mock menyala.
 *
 * Tanpa ini, satu-satunya gejalanya adalah kegagalan yang tampak seperti
 * masalah jaringan — dan orang yang mengalaminya akan menghabiskan waktu
 * memeriksa kabel, firewall, dan backend yang sebenarnya sehat.
 */
if (API_MOCK_MODE && typeof console !== "undefined") {
  console.warn(
    "[SignLearn] VITE_API_MOCK_MODE=true — seluruh permintaan API memakai data palsu " +
      "dan TIDAK menyentuh backend. Login serta register akan gagal. " +
      "Setel VITE_API_MOCK_MODE=false di frontend/.env untuk memakai server sungguhan.",
  );
}

// ─── Token di memori ─────────────────────────────────────────────────────

let accessToken = null;
let onSessionExpired = () => {};

/**
 * Hasil pemulihan sesi, di-memo per pemuatan halaman.
 *
 * Dideklarasikan bersama state modul lainnya — bukan di dekat
 * `bootstrapSession()` — supaya `clearAccessToken()` di bawah tidak
 * mereferensikan pengikatan yang letaknya jauh di bawahnya.
 */
let bootstrapPromise = null;

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  // Pemulihan sesi berikutnya harus benar-benar bertanya ke server, bukan
  // memakai ulang hasil yang di-cache dari sesi yang baru saja berakhir.
  bootstrapPromise = null;
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

/**
 * @returns {Promise<{accessToken: string, user: object}|null>} isi envelope
 *
 * Mengembalikan SELURUH payload, bukan hanya token, karena `bootstrapSession`
 * membutuhkan `user` dari respons yang sama. Bila ia memanggil endpointnya
 * sendiri untuk mendapatkan user, kunci di bawah kehilangan artinya.
 */
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then((response) => {
        const payload = response.data?.data ?? null;
        setAccessToken(payload?.accessToken ?? null);
        return payload;
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
        const token = (await refreshSession())?.accessToken ?? null;
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
  // AxiosError juga memiliki `code`, `status`, dan `message`. Respons backend
  // harus diprioritaskan agar pesan bermakna tidak berubah menjadi teks generik.
  if (!error?.response && error?.code && error?.status && error?.message) return error;
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

    /**
     * Tanpa `mockData`, mode mock TIDAK dapat menjawab apa pun.
     *
     * Versi sebelumnya mengembalikan `null` di sini. Karena tidak ada satu pun
     * pemanggil di seluruh aplikasi yang mengirim `mockData`, itu berarti
     * SETIAP panggilan API mengembalikan null — dan `authService.login()` lalu
     * menjalankan `payload.accessToken` pada null, melempar TypeError.
     *
     * TypeError tidak punya `.code`, `.status`, maupun `.response`, sehingga
     * `normalizeError` menjatuhkannya ke cabang terakhir dan pengguna membaca
     * "Tidak dapat terhubung ke server. Periksa koneksi Anda." Orang lalu
     * memeriksa jaringan, firewall, dan backend yang sebenarnya sehat.
     *
     * Melempar galat yang menyebut penyebabnya mengubah kebingungan setengah
     * jam menjadi satu kalimat.
     */
    if (mockData === null || mockData === undefined) {
      throw {
        status: 0,
        code: "MOCK_MODE_NO_FIXTURE",
        message:
          `Mode mock aktif (VITE_API_MOCK_MODE=true) dan tidak ada data palsu untuk ${method.toUpperCase()} ${url}. ` +
          "Setel VITE_API_MOCK_MODE=false di frontend/.env lalu jalankan ulang dev server.",
      };
    }
    return mockData;
  }

  /**
   * `data` dan `params` hanya disertakan bila benar-benar ada.
   *
   * ── Kenapa ini penting, bukan sekadar kerapian ────────────────────────
   *
   * Meneruskan `data: null` membuat axios MENGIRIM body berisi teks literal
   * `null` (empat karakter) beserta header `Content-Type: application/json`.
   * Itu memang JSON yang sah — tetapi `express.json()` berjalan dengan
   * `strict: true` secara bawaan, yang HANYA menerima objek atau array di
   * tingkat atas. Body `null` ditolak sebagai SyntaxError, dan pemanggil
   * menerima 400 "Body request bukan JSON yang valid".
   *
   * Yang terkena adalah SETIAP permintaan tanpa payload:
   *
   *     POST   /auth/logout
   *     DELETE /courses/:id          DELETE /users/:id
   *     DELETE /courses/../lessons/:id
   *     DELETE /courses/../quizzes/:id
   *     DELETE /courses/../questions/:id
   *
   * Gejalanya paling membingungkan pada logout: tombolnya "tidak melakukan
   * apa-apa" karena galat 400 membatalkan sisa fungsi keluar sebelum sempat
   * membersihkan sesi dan berpindah halaman.
   */
  const config = { method, url, headers };
  if (data !== null && data !== undefined) config.data = data;
  if (params !== null && params !== undefined) config.params = params;

  const response = await apiClient.request(config);
  return response.data?.data ?? null;
}

/**
 * Memulihkan sesi saat aplikasi dimuat.
 *
 * ── Kenapa ini WAJIB lewat `refreshSession()`, bukan apiClient langsung ──
 *
 * Versi sebelumnya memanggil `apiClient.post("/auth/refresh")` sendiri,
 * melewati kunci single-flight di atas. Akibatnya fatal dan sulit dilacak:
 *
 *   1. `React.StrictMode` menjalankan efek DUA KALI di mode pengembangan
 *      (main.jsx). `AppProvider` memanggil fungsi ini di dalam useEffect.
 *   2. Dua permintaan `/auth/refresh` berangkat hampir bersamaan.
 *   3. Backend MEROTASI refresh token pada permintaan pertama.
 *   4. Permintaan kedua membawa token yang sudah dirotasi. Backend
 *      memperlakukannya sebagai PENCURIAN TOKEN dan mencabut SELURUH rantai
 *      sesi — perilaku keamanan yang memang disengaja.
 *   5. Pengguna yang sudah masuk terlempar ke halaman login setiap menekan F5,
 *      dan kelihatannya seperti "perubahan tidak tersimpan" karena halaman
 *      berpindah tepat setelah menyimpan.
 *
 * Ironisnya kunci single-flight sudah ada beserta komentar yang menjelaskan
 * bahaya ini persis; fungsi inilah satu-satunya yang tidak memakainya.
 *
 * Hasilnya juga di-memo per pemuatan halaman: pemulihan sesi adalah peristiwa
 * sekali-jalan, dan `refreshPromise` sendiri dibersihkan segera setelah selesai
 * sehingga tidak cukup untuk menahan pemanggilan kedua dari StrictMode yang
 * datang setelah yang pertama tuntas.
 *
 * @returns {Promise<object|null>} user bila sesi pulih, `null` bila tamu
 */
export function bootstrapSession() {
  if (API_MOCK_MODE) return Promise.resolve(null);

  if (!bootstrapPromise) {
    bootstrapPromise = refreshSession()
      .then((payload) => payload?.user ?? null)
      .catch(() => {
        // Tidak ada cookie, atau sudah kedaluwarsa. Tamu — bukan error.
        accessToken = null;
        return null;
      });
  }
  return bootstrapPromise;
}

export { apiClient };
