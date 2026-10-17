import { Router } from "express";
import { createNote, deleteNote, listNotes, syncChanges, updateNote } from "../controllers/notes.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = Router();

router.get("/", requireAuth, listNotes);
router.post("/", requireAuth, createNote);
router.put("/:id", requireAuth, validateObjectId("id"), updateNote);
router.delete("/:id", requireAuth, validateObjectId("id"), deleteNote);
router.post("/sync", requireAuth, syncChanges);

export default router;
