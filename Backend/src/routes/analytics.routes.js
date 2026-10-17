import { Router } from "express";
import { getAdminAnalytics, getAnalyticsSummary, getStudentAnalytics, trackEvent } from "../controllers/analytics.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/events", requireAuth, trackEvent);
router.get("/summary", requireAuth, requireRole("admin", "cash_manager", "content_manager"), getAnalyticsSummary);
router.get("/admin", requireAuth, requireRole("admin"), getAdminAnalytics);
router.get("/student", requireAuth, getStudentAnalytics);

export default router;
