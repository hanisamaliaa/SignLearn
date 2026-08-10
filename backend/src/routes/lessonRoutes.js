import { Router } from "express";
import * as lessonController from "../controllers/lessonController.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  validateCreateLesson,
  validateUpdateLesson,
} from "../validators/lessonValidator.js";

const router = Router();

/**
 * Rute pelajaran datar — akses langsung berdasarkan id.
 *
 * Bentuk kanonik ada di `/courses/:courseId/lessons` (API Contract §8.6-8.9).
 * Rute datar ini melengkapinya untuk CMS, yang menyunting pelajaran
 * berdasarkan id tanpa perlu tahu kursus induknya.
 *
 * ── Kenapa setiap rute punya penjaga eksplisit ────────────────────────
 *
 * Versi sebelumnya tidak memasang middleware sama sekali. Konsekuensinya
 * `DELETE /api/v1/lessons/1` dapat dijalankan siapa pun di internet, tanpa
 * token, dan menghapus pelajaran beserta seluruh riwayat belajar pengguna
 * lewat ON DELETE CASCADE.
 *
 * Penjaga ditulis per rute, bukan sebagai `router.use()` global, agar
 * terlihat langsung saat membaca: satu baris = satu rute = siapa yang boleh.
 */

// Baca — publik, tetapi identitas dibaca bila ada agar status progres
// dan pemeriksaan pelajaran terkunci dapat bekerja.
router.get("/:id", optionalAuthenticate, lessonController.getById);

// Tulis — admin saja.
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(validateCreateLesson),
  lessonController.create,
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(validateUpdateLesson),
  lessonController.update,
);

router.delete("/:id", authenticate, requireAdmin, lessonController.remove);

export default router;
