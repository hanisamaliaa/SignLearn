import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  validateRegister,
  validateLogin,
} from "../validators/authValidator.js";

const router = Router();

router.post("/register", validate(validateRegister), authController.register);
router.post("/login", validate(validateLogin), authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authenticate, authController.me);

export default router;
