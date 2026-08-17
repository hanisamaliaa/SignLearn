import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  loginLimiter,
  loginEmailLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  forgotPasswordEmailLimiter,
  refreshLimiter,
} from "../middleware/rateLimit.middleware.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} from "../validators/authValidator.js";

const router = Router();

/**
 * Rute auth.
 *
 * Urutan middleware pada tiap rute disengaja dan bermakna:
 *   rate limit → validasi → controller
 *
 * Rate limit didahulukan agar request yang membanjir ditolak sebelum menyentuh
 * validator maupun database. Menempatkannya setelah validasi berarti penyerang
 * tetap dapat memaksa server bekerja pada setiap request.
 */

// ─── Publik ──────────────────────────────────────────────────────────────
router.post(
  "/register",
  registerLimiter,
  validate(validateRegister),
  authController.register,
);

router.post(
  "/login",
  loginLimiter,        // per IP
  loginEmailLimiter,   // per email — menutup serangan terdistribusi
  validate(validateLogin),
  authController.login,
);

// Tanpa `authenticate`: access token justru sudah kedaluwarsa saat ini dipanggil.
// Kredensialnya adalah cookie HttpOnly, bukan header Authorization.
router.post("/refresh", refreshLimiter, authController.refresh);

router.post("/logout", authController.logout);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,       // per IP
  forgotPasswordEmailLimiter,  // per email — melindungi kotak masuk target
  validate(validateForgotPassword),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validate(validateResetPassword),
  authController.resetPassword,
);

// ─── Terautentikasi ──────────────────────────────────────────────────────
router.get("/me", authenticate, authController.me);
router.get("/sessions", authenticate, authController.listSessions);
router.post("/logout-all", authenticate, authController.logoutAll);

router.post(
  "/change-password",
  authenticate,
  validate(validateChangePassword),
  authController.changePassword,
);

export default router;
