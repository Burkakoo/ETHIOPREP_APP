import { AnalyticsDaily } from "../models/AnalyticsDaily.js";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
import { User } from "../models/User.js";
import { Question } from "../models/Question.js";
import { Exam } from "../models/Exam.js";
import { Payment } from "../models/Payment.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Subject } from "../models/Subject.js";

export async function trackEvent(request, response) {
  try {
    const { eventName, entityType, entityId, properties, deviceId, sessionId, appVersion, platform } = request.body;

    if (!eventName) {
      return response.status(400).json({ error: "eventName is required." });
    }

    const event = await AnalyticsEvent.create({
      userId: request.user._id,
      eventName,
      entityType,
      entityId,
      properties,
      deviceId,
      sessionId,
      appVersion,
      platform
    });

    return response.status(201).json({ event });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to track analytics event." });
  }
}

export async function getAnalyticsSummary(request, response) {
  try {
    const metric = request.query.metric || "app_open";
    const summary = await AnalyticsDaily.find({ metric }).sort({ date: -1 }).limit(30);
    return response.json({ summary });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to load analytics summary." });
  }
}

export async function getAdminAnalytics(request, response) {
  try {
    const [
      totalUsers,
      activeUsers,
      premiumUsers,
      totalQuestions,
      totalExams,
      revAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ isPremium: true }),
      Question.countDocuments({ isActive: true }),
      Exam.countDocuments({ status: "published" }),
      Payment.aggregate([
        { $match: { status: "verified" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalRevenue = revAgg[0]?.total || 0;

    return response.json({
      totalUsers,
      activeUsers,
      premiumUsers,
      totalQuestions,
      totalExams,
      totalRevenue
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to load admin analytics." });
  }
}

export async function getStudentAnalytics(request, response) {
  try {
    const userId = request.user._id;

    // Fetch all submitted attempts for this user
    const attempts = await ExamAttempt.find({ userId, status: "submitted" })
      .populate("examId", "subjectId title")
      .lean();

    let totalQuestionsAttempted = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    const subjectStats = {};

    for (const attempt of attempts) {
      const answers = attempt.answers || [];
      const subId = attempt.examId?.subjectId ? String(attempt.examId.subjectId) : "general";

      if (!subjectStats[subId]) {
        subjectStats[subId] = { attempted: 0, correct: 0 };
      }

      for (const ans of answers) {
        totalQuestionsAttempted++;
        subjectStats[subId].attempted++;
        if (ans.isCorrect) {
          correctAnswers++;
          subjectStats[subId].correct++;
        } else {
          wrongAnswers++;
        }
      }
    }

    const accuracyPercentage = totalQuestionsAttempted > 0
      ? Math.round((correctAnswers / totalQuestionsAttempted) * 100)
      : 0;

    // Populate subject names
    const subjects = await Subject.find().select("name code").lean();
    const subMap = new Map(subjects.map(s => [String(s._id), s.name]));

    const subjectPerformance = Object.entries(subjectStats).map(([subId, stat]) => ({
      subjectId: subId,
      subjectName: subMap.get(subId) || "General",
      attempted: stat.attempted,
      correct: stat.correct,
      accuracy: stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0
    }));

    return response.json({
      totalQuestionsAttempted,
      correctAnswers,
      wrongAnswers,
      accuracyPercentage,
      subjectPerformance,
      totalExamsCompleted: attempts.length
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to load student analytics." });
  }
}
