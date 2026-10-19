import { Router } from "express";
import { archiveExam, createExam, listPublishedExams, publishExam, restoreExam, startExamAttempt, submitExamAttempt, updateExam } from "../controllers/exam.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = Router();

router.get("/", requireAuth, listPublishedExams);
router.post("/", requireAuth, requireRole("content_manager", "admin"), createExam);
router.patch("/:examId", requireAuth, validateObjectId("examId"), requireRole("content_manager", "admin"), updateExam);
router.patch("/:examId/publish", requireAuth, validateObjectId("examId"), requireRole("content_manager", "admin"), publishExam);
router.patch("/:examId/archive", requireAuth, validateObjectId("examId"), requireRole("content_manager", "admin"), archiveExam);
router.patch("/:examId/restore", requireAuth, validateObjectId("examId"), requireRole("content_manager", "admin"), restoreExam);
router.post("/:examId/start", requireAuth, validateObjectId("examId"), startExamAttempt);
router.post("/attempts/:attemptId/submit", requireAuth, validateObjectId("attemptId"), submitExamAttempt);

export default router;
