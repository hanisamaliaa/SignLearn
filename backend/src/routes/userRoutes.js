import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as profileController from "../controllers/profileController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadSingleImage } from "../middleware/imageUpload.middleware.js";
import { imageUploadLimiter } from "../middleware/rateLimit.middleware.js";
import {
  validateUpdateProfile,
  validateAdminUpdateUser,
  validateUserQuery,
} from "../validators/userValidator.js";

const router = Router();

/**
 * Rute pengguna & profil (API Contract §7).
 *
 * `/profile` didaftarkan SEBELUM `/:id`. Express mencocokkan berurutan, jadi
 * bila terbalik, permintaan ke `/profile` tertangkap sebagai id = "profile",
 * lalu ditolak `requireAdmin` — pengguna biasa menerima 403 saat membuka
 * halaman profilnya sendiri, dan penyebabnya nyaris mustahil ditebak.
 */

// ─── Profil sendiri — pengguna terautentikasi mana pun ───────────────────
router.get("/profile", authenticate, profileController.getProfile);
router.put(
  "/profile",
  authenticate,
  validate(validateUpdateProfile),
  profileController.updateProfile,
);
router.post(
  "/profile/avatar",
  authenticate,
  imageUploadLimiter,
  uploadSingleImage,
  profileController.uploadAvatar,
);

// ─── Administrasi pengguna — admin saja ──────────────────────────────────
router.get(
  "/",
  authenticate,
  requireAdmin,
  validate(validateUserQuery),
  userController.getAllUsers,
);

router.get("/:id", authenticate, requireAdmin, userController.getUserById);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validate(validateAdminUpdateUser),
  userController.updateUser,
);

router.delete("/:id", authenticate, requireAdmin, userController.deleteUser);

export default router;
