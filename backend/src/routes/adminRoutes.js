import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import * as aiController from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  validateActivityQuery,
  validateQuizResultQuery,
} from "../validators/reportValidator.js";

const router = Router();

/**
 * Rute khusus admin.
 *
 * Seluruh rute di bawah ini wajib admin terautentikasi.
 *
 * ── Kenapa CRUD course & lesson TIDAK ada di sini ─────────────────────
 *
 * Sebelumnya berkas ini juga memuat POST/PUT/DELETE untuk course dan lesson,
 * sehingga operasi yang sama terekspos di TIGA path berbeda:
 *
 *     POST /admin/lessons
 *     POST /lessons
 *     POST /courses/:courseId/lessons
 *
 * Tiga permukaan untuk satu operasi berarti tiga tempat memasang validasi,
 * tiga tempat memasang penjaga peran, dan tiga tempat yang perlahan menyimpang.
 * Menambah aturan bisnis baru berarti mengingat ketiganya — dan yang terlupa
 * menjadi lubang yang tidak terlihat sampai ada yang memanfaatkannya.
 *
 * CRUD sekarang hanya di `/courses/**` dan `/lessons/**`, keduanya sudah
 * dijaga `requireAdmin` per rute. `/admin/**` menyimpan yang benar-benar
 * khusus admin: statistik, aktivitas, dan pekerjaan AI.
 */
router.use(authenticate, requireAdmin);

// ─── Ringkasan & audit ───────────────────────────────────────────────────
router.get("/stats", adminController.getStats);
router.get(
  "/activities",
  validate(validateActivityQuery),
  adminController.getRecentActivities,
);

// Hasil kuis seluruh pengguna — sumber data halaman Laporan.
//
// Ini BUKAN duplikat `/admin/activities?type=quiz_passed`. Feed aktivitas
// hanya memuat pengerjaan yang LULUS; laporan membutuhkan keduanya, kalau
// tidak distribusi nilainya tidak pernah menampilkan satu pun kegagalan.
router.get(
  "/quiz-results",
  validate(validateQuizResultQuery),
  adminController.getQuizResults,
);

// ─── Fitur AI (placeholder, API Contract §10.8) ──────────────────────────
router.post("/ai/subtitles/:lessonId", aiController.generateSubtitles);
router.post("/ai/quiz/:lessonId", aiController.generateQuiz);

export default router;
