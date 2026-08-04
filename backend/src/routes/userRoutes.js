import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as profileController from "../controllers/profileController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";

const router = Router();

// User profile (me) — authenticated user only.
router.get("/profile", authenticate, profileController.getProfile);
router.put("/profile", authenticate, profileController.updateProfile);

// Admin-only user management.
router.get("/", authenticate, requireAdmin, userController.getAllUsers);
router.get("/:id", authenticate, requireAdmin, userController.getUserById);
router.put("/:id", authenticate, requireAdmin, userController.updateUser);
router.delete("/:id", authenticate, requireAdmin, userController.deleteUser);

export default router;
