import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import courseRoutes from "./courseRoutes.js";
import progressRoutes from "./progressRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/courses", courseRoutes);
router.use("/progress", progressRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);

export default router;
