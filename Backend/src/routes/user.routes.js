import { Router } from "express";
import { listUsers, updateUserRole, updateUserStatus } from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listUsers);
router.patch("/:id/role", validateObjectId("id"), updateUserRole);
router.patch("/:id/status", validateObjectId("id"), updateUserStatus);

export default router;
