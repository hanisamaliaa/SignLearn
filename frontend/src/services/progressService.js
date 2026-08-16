import { request } from "./api";

/**
 * Progress & dashboard — API Contract §10.1-10.5.
 *
 * Aturan buka-kunci pelajaran TIDAK diduplikasi di frontend. Server yang
 * memutuskannya, karena ia satu-satunya pihak yang melihat progres sekaligus
 * hasil kuis. Menyalin aturannya ke klien berarti dua sumber kebenaran yang
 * pasti menyimpang — dan yang di klien dapat dilewati lewat DevTools.
 */

export async function getUserProgress() {
  return request({ url: "/progress" });
}

export async function getCourseAccess(courseId) {
  const payload = await request({ url: `/progress/courses/${courseId}` });
  return payload.items;
}

/** Idempoten — menandai `completed` dua kali tidak menggeser `completedAt`. */
export async function updateLessonProgress(lessonId, status = "completed") {
  return request({
    method: "put", url: `/progress/lessons/${lessonId}`, data: { status },
  });
}

export async function getDashboard() {
  return request({ url: "/dashboard/me" });
}

/**
 * Riwayat kuis, sudah dikelompokkan per kuis oleh server.
 *
 * Pengelompokan dan agregat huruf sengaja dihitung di server: ia satu-satunya
 * pihak yang melihat seluruh percobaan tanpa perlu mengirim jawaban per soal
 * ke setiap pemuatan halaman.
 */
export async function getQuizHistory() {
  return request({ url: "/progress/quiz-history" });
}

/** Detail satu percobaan: benar/salah per soal beserta kursusnya. */
export async function getQuizResultDetail(resultId) {
  const payload = await request({ url: `/progress/quiz-results/${resultId}` });
  return payload.result;
}
