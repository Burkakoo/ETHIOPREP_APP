import { Router } from "express";
import {
  createChapter,
  createQuestion,
  createSubject,
  deactivateChapter,
  deactivateQuestion,
  deactivateSubject,
  getChaptersBySubject,
  getQuestions,
  getSubjects
} from "../controllers/questionBank.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = Router();

router.get("/subjects", requireAuth, getSubjects);
router.post("/subjects", requireAuth, requireRole("content_manager", "admin"), createSubject);
router.patch("/subjects/:subjectId/deactivate", requireAuth, validateObjectId("subjectId"), requireRole("content_manager", "admin"), deactivateSubject);

router.get("/subjects/:subjectId/chapters", requireAuth, validateObjectId("subjectId"), getChaptersBySubject);
router.post("/subjects/:subjectId/chapters", requireAuth, validateObjectId("subjectId"), requireRole("content_manager", "admin"), createChapter);
router.patch("/chapters/:chapterId/deactivate", requireAuth, validateObjectId("chapterId"), requireRole("content_manager", "admin"), deactivateChapter);

router.get("/questions", requireAuth, getQuestions);
router.post("/questions", requireAuth, requireRole("content_manager", "admin"), createQuestion);
router.patch("/questions/:questionId/deactivate", requireAuth, validateObjectId("questionId"), requireRole("content_manager", "admin"), deactivateQuestion);

export default router;
