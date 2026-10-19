import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import examRoutes from "./routes/exam.routes.js";
import healthRoutes from "./routes/health.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import questionBankRoutes from "./routes/questionBank.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import userRoutes from "./routes/user.routes.js";
import { apiRateLimit } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: env.clientOrigins,
  credentials: true
}));
app.use(apiRateLimit);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.get("/", (_request, response) => {
  response.json({
    name: "EthioPrep API",
    version: "0.1.0",
    documentation: "/api/health"
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
