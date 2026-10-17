import { Router } from "express";
import { getProfile, loginUser, me, registerUser, updatePassword, updateProfile, updateStream } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, me);
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/password", requireAuth, updatePassword);
router.patch("/stream", requireAuth, updateStream);

export default router;

