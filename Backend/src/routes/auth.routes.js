import { Router } from "express";
import { getProfile, loginUser, logout, me, refreshToken, registerUser, updatePassword, updateProfile, updateStream } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/password", requireAuth, updatePassword);
router.patch("/stream", requireAuth, updateStream);

export default router;

