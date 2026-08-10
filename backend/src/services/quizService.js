import * as quizRepo from "../repositories/quizRepository.js";
import * as courseRepo from "../repositories/courseRepository.js";
import * as lessonRepo from "../repositories/lessonRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, meta } from "../utils/pagination.js";

/**
 * Quiz service — aturan bisnis kuis, pertanyaan, dan penilaian.
 *
 * ── KKM (Kriteria Ketuntasan Minimal) ────────────────────────────────
 *
 * Ambang kelulusan dibaca dari `quizzes.min_passing_score`, BUKAN konstanta
 * global. Skema memberi default 70 sesuai tracker tim, tetapi tiap kuis boleh
 * punya ambangnya sendiri — kuis diagnostik awal wajar lebih rendah daripada
 * ujian akhir modul.
 *
 * Versi sebelumnya menetapkan `MIN_PASSING_SCORE = 55` di kode sementara
 * komentarnya menyebut 70 dan skema memakai 70. Tiga sumber kebenaran yang
 * saling bertentangan; sekarang hanya ada satu, yaitu kolom database.
 */

async function requireCourse(courseId) {
  const course = await courseRepo.findById(courseId);
  if (!course) throw ApiError.notFound("Kursus tidak ditemukan.");
  return course;
}

/** Kuis harus ada DAN benar-benar milik kursus pada path. */
async function requireQuizInCourse(courseId, quizId) {
  const quiz = await quizRepo.findById(quizId);
  if (!quiz) throw ApiError.notFound("Kuis tidak ditemukan.");

  if (quiz.courseId !== String(courseId)) {
    // 404, bukan 403 — dari sudut pandang kursus ini kuis itu memang tidak ada.
    throw ApiError.notFound("Kuis tidak ditemukan pada kursus ini.");
  }
  return quiz;
}

// ─── Kuis ────────────────────────────────────────────────────────────────

export async function listByCourse(courseId, options = {}, viewer = null) {
  await requireCourse(courseId);

  const { page, limit, offset } = paginate(options);
  const total = await quizRepo.countByCourse(courseId);

  const items = viewer?.id && viewer.role === "user"
    ? await quizRepo.findByCourseWithAttempts(courseId, viewer.id, { limit, offset })
    : await quizRepo.findByCourse(courseId, { limit, offset });

  return { items, pagination: meta(page, limit, total) };
}

/**
 * Detail kuis beserta pertanyaannya.
 *
 * Bentuk `questions` BERGANTUNG PERAN — ini satu-satunya hal yang membuat
 * kuis bermakna. Peserta tidak pernah menerima `correctIndex`.
 */
export async function getById(courseId, quizId, viewer = null) {
  const quiz = await requireQuizInCourse(courseId, quizId);

  const isAdmin = viewer?.role === "admin";
  const questions = await quizRepo.findQuestions(quizId, isAdmin);

  const result = { quiz, questions };

  if (viewer?.id && viewer.role === "user") {
    result.attempt = await quizRepo.findBestAttempt(quizId, viewer.id);
  }
  return result;
}

export async function create(courseId, data) {
  await requireCourse(courseId);

  // Kuis boleh terikat pelajaran; bila ya, pelajaran itu harus ada DAN
  // berada di kursus yang sama.
  if (data.lessonId) {
    const lesson = await lessonRepo.findById(data.lessonId);
    if (!lesson) throw ApiError.notFound("Pelajaran tidak ditemukan.");
    if (lesson.courseId !== String(courseId)) {
      throw ApiError.validation("Pelajaran tidak berada pada kursus ini.", [
        { field: "lessonId", message: "Pelajaran harus berasal dari kursus yang sama." },
      ]);
    }
  }

  return quizRepo.create(courseId, data);
}

export async function update(courseId, quizId, data) {
  await requireQuizInCourse(courseId, quizId);

  if (data.lessonId) {
    const lesson = await lessonRepo.findById(data.lessonId);
    if (!lesson) throw ApiError.notFound("Pelajaran tidak ditemukan.");
    if (lesson.courseId !== String(courseId)) {
      throw ApiError.validation("Pelajaran tidak berada pada kursus ini.", [
        { field: "lessonId", message: "Pelajaran harus berasal dari kursus yang sama." },
      ]);
    }
  }

  return quizRepo.update(quizId, data);
}

/**
 * Menghapus kuis.
 *
 * Ditolak bila sudah ada hasil pengerjaan: `quiz_results` memakai
 * ON DELETE CASCADE, sehingga menghapus kuis menghapus seluruh nilai
 * pengguna secara permanen.
 */
export async function remove(courseId, quizId) {
  await requireQuizInCourse(courseId, quizId);

  if (await quizRepo.hasResults(quizId)) {
    throw ApiError.conflict(
      "Kuis ini sudah dikerjakan sebagian pengguna. Menghapusnya akan menghilangkan seluruh nilai mereka.",
    );
  }

  const deleted = await quizRepo.remove(quizId);
  if (!deleted) throw ApiError.notFound("Kuis tidak ditemukan.");
}

// ─── Pertanyaan ──────────────────────────────────────────────────────────

export async function listQuestions(courseId, quizId) {
  await requireQuizInCourse(courseId, quizId);
  // Endpoint ini khusus admin (dijaga di router), jadi kunci jawaban ikut.
  return quizRepo.findQuestions(quizId, true);
}

export async function createQuestion(courseId, quizId, data) {
  await requireQuizInCourse(courseId, quizId);
  return quizRepo.createQuestion(quizId, data);
}

async function requireQuestionInQuiz(quizId, questionId) {
  const question = await quizRepo.findQuestionById(questionId);
  if (!question) throw ApiError.notFound("Pertanyaan tidak ditemukan.");
  if (question.quizId !== String(quizId)) {
    throw ApiError.notFound("Pertanyaan tidak ditemukan pada kuis ini.");
  }
  return question;
}

export async function updateQuestion(courseId, quizId, questionId, data) {
  await requireQuizInCourse(courseId, quizId);
  await requireQuestionInQuiz(quizId, questionId);
  return quizRepo.updateQuestion(questionId, data);
}

export async function removeQuestion(courseId, quizId, questionId) {
  await requireQuizInCourse(courseId, quizId);
  await requireQuestionInQuiz(quizId, questionId);

  const deleted = await quizRepo.removeQuestion(questionId);
  if (!deleted) throw ApiError.notFound("Pertanyaan tidak ditemukan.");
}

export async function reorderQuestions(courseId, quizId, orderedIds) {
  await requireQuizInCourse(courseId, quizId);

  try {
    return await quizRepo.reorderQuestions(quizId, orderedIds);
  } catch (err) {
    if (err.code === "INCOMPLETE_ORDER") {
      throw ApiError.validation("Daftar urutan harus memuat seluruh pertanyaan pada kuis ini.", [
        { field: "order", message: "Jumlah atau isi id tidak cocok dengan pertanyaan kuis ini." },
      ]);
    }
    throw err;
  }
}

// ─── Penilaian ───────────────────────────────────────────────────────────

/**
 * Mengerjakan kuis.
 *
 * PENILAIAN SEPENUHNYA DI SERVER. Jawaban dari klien hanya berisi
 * `selectedIndex`; benar atau salahnya ditentukan dengan membandingkannya
 * ke kunci jawaban yang diambil langsung dari database. Klien tidak pernah
 * mengirim skor, dan tidak pernah menerima kunci jawaban sebelum mengerjakan.
 *
 * Rumus (API Contract §8.12), ditetapkan di satu tempat agar BE dan FE
 * tidak pernah berbeda hitungan:
 *
 *     score  = round(correctCount / totalQuestions * 100)   // half-up
 *     passed = score >= quiz.minPassingScore
 */
export async function submit(courseId, quizId, userId, { answers, durationSeconds }) {
  const quiz = await requireQuizInCourse(courseId, quizId);
  const answerKey = await quizRepo.findAnswerKey(quizId);

  if (answerKey.length === 0) {
    throw ApiError.conflict("Kuis ini belum memiliki pertanyaan.");
  }

  const submitted = new Map(answers.map((a) => [String(a.questionId), Number(a.selectedIndex)]));

  // Seluruh pertanyaan wajib dijawab. Membiarkan jawaban parsial berarti
  // peserta dapat menaikkan skor dengan hanya mengirim soal yang ia yakini.
  const missing = answerKey.filter((k) => !submitted.has(k.id));
  if (missing.length > 0) {
    throw ApiError.validation(
      `Masih ada ${missing.length} pertanyaan yang belum dijawab.`,
      [{ field: "answers", message: `Seluruh ${answerKey.length} pertanyaan wajib dijawab.` }],
    );
  }

  // Jawaban untuk pertanyaan di luar kuis ini ditolak — indikasi klien rusak
  // atau percobaan manipulasi.
  const validIds = new Set(answerKey.map((k) => k.id));
  const stray = [...submitted.keys()].filter((id) => !validIds.has(id));
  if (stray.length > 0) {
    throw ApiError.validation("Terdapat jawaban untuk pertanyaan yang tidak ada pada kuis ini.", [
      { field: "answers", message: `questionId tidak dikenali: ${stray.join(", ")}` },
    ]);
  }

  const review = answerKey.map((k) => {
    const selectedIndex = submitted.get(k.id);
    // Indeks di luar jangkauan pilihan dihitung salah, bukan error —
    // klien rusak tidak boleh menggagalkan seluruh pengerjaan.
    const inRange = selectedIndex >= 0 && selectedIndex < k.optionCount;
    return {
      questionId: k.id,
      selectedIndex,
      correctIndex: k.correctIndex,
      isCorrect: inRange && selectedIndex === k.correctIndex,
    };
  });

  const correctCount = review.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / answerKey.length) * 100);
  const passed = score >= quiz.minPassingScore;

  const saved = await quizRepo.saveResult({
    userId,
    quizId,
    score,
    passed,
    answers: review.map(({ questionId, selectedIndex, isCorrect }) => ({
      questionId, selectedIndex, isCorrect,
    })),
  });

  return {
    id: saved.id,
    quizId: saved.quizId,
    quizTitle: quiz.title,
    score,
    passed,
    correctCount,
    totalQuestions: answerKey.length,
    minPassingScore: quiz.minPassingScore,
    durationSeconds: durationSeconds ?? null,
    takenAt: saved.takenAt,
    // `review` dikembalikan HANYA pada respons submit, agar peserta dapat
    // mempelajari kesalahannya. Ia tidak muncul di listing riwayat.
    review,
  };
}

