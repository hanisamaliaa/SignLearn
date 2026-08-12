import { request } from "./api";

/**
 * Quizzes — API Contract §8.10-8.13.
 *
 * ── Penilaian TIDAK lagi dihitung di klien ────────────────────────────
 *
 * Halaman kuis dulu menghitung skor sendiri memakai kunci jawaban yang ikut
 * terkirim ke browser. Siapa pun yang membuka DevTools dapat membacanya
 * sebelum menjawab, dan skor apa pun dapat dikirim ke server.
 *
 * Sekarang klien hanya mengirim `selectedIndex`. Server yang membandingkannya
 * ke kunci jawaban dan menentukan kelulusan terhadap KKM milik kuis itu.
 * `correctIndex` bahkan tidak pernah dikirim ke peran `user`.
 */

export async function getQuizzes(courseId, params = {}) {
  return request({ url: `/courses/${courseId}/quizzes`, params });
}

export async function getQuizById(courseId, quizId) {
  return request({ url: `/courses/${courseId}/quizzes/${quizId}` });
}

/**
 * @param {Array<{questionId: string, selectedIndex: number}>} answers
 *        SELURUH pertanyaan wajib dijawab — kurang satu pun ditolak 422.
 */
export async function submitQuiz(courseId, quizId, answers, durationSeconds) {
  const payload = await request({
    method: "post",
    url: `/courses/${courseId}/quizzes/${quizId}/submit`,
    data: { answers, durationSeconds },
  });
  return payload.result;
}

// ─── Admin ───────────────────────────────────────────────────────────────

export async function createQuiz(courseId, data) {
  const payload = await request({ method: "post", url: `/courses/${courseId}/quizzes`, data });
  return payload.quiz;
}

export async function updateQuiz(courseId, quizId, data) {
  const payload = await request({
    method: "put", url: `/courses/${courseId}/quizzes/${quizId}`, data,
  });
  return payload.quiz;
}

export async function deleteQuiz(courseId, quizId) {
  return request({ method: "delete", url: `/courses/${courseId}/quizzes/${quizId}` });
}

export async function getQuestions(courseId, quizId) {
  const payload = await request({ url: `/courses/${courseId}/quizzes/${quizId}/questions` });
  return payload.items;
}

export async function createQuestion(courseId, quizId, data) {
  const payload = await request({
    method: "post", url: `/courses/${courseId}/quizzes/${quizId}/questions`, data,
  });
  return payload.question;
}

export async function updateQuestion(courseId, quizId, questionId, data) {
  const payload = await request({
    method: "put",
    url: `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`,
    data,
  });
  return payload.question;
}

export async function deleteQuestion(courseId, quizId, questionId) {
  return request({
    method: "delete",
    url: `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`,
  });
}

/**
 * Mengubah urutan pertanyaan.
 *
 * `order` WAJIB memuat SELURUH id pertanyaan kuis ini; kurang atau lebih satu
 * pun ditolak 422 `INCOMPLETE_ORDER`. Server menetapkan `sort_order = index+1`
 * menurut posisi di array, jadi yang dikirim adalah urutan akhir yang
 * diinginkan — bukan pasangan id yang bertukar.
 */
export async function reorderQuestions(courseId, quizId, order) {
  const payload = await request({
    method: "patch",
    url: `/courses/${courseId}/quizzes/${quizId}/questions/reorder`,
    data: { order },
  });
  return payload.items;
}
