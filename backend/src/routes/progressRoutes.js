import { Router } from "express";
import * as progressController from "../controllers/progressController.js";

const router = Router();

router.post("/lesson", progressController.completeLesson);

router.get("/", progressController.getUserProgress);

export default router;
