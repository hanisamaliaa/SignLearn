import { Router } from "express";
import * as lessonController from "../controllers/lessonController.js";

const router = Router();

router.get("/", lessonController.getAllLessons);

router.get("/course/:courseId", lessonController.getLessonsByCourse);

router.get("/:id", lessonController.getLessonById);

router.post("/", lessonController.createLesson);

router.put("/:id", lessonController.updateLesson);

router.delete("/:id", lessonController.deleteLesson);

export default router;
