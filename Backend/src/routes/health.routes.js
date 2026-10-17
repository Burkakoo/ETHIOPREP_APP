import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_request, response) => {
  const databaseState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  response.status(databaseState === "connected" ? 200 : 503).json({
    status: databaseState === "connected" ? "ok" : "degraded",
    service: "ethioprep-api",
    database: databaseState,
    timestamp: new Date().toISOString()
  });
});

export default router;
