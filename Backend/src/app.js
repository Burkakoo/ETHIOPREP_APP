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

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

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

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error." });
});
