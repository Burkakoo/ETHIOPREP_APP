import mongoose from "mongoose";
import { Exam } from "../models/Exam.js";
import { Chapter } from "../models/Chapter.js";
import { ExamAttempt } from "../models/ExamAttempt.js";
import { Question } from "../models/Question.js";
import { Subscription } from "../models/Subscription.js";
import { Subject } from "../models/Subject.js";

export async function listPublishedExams(request, response) {
  try {
    const canManage = ["admin", "content_manager"].includes(request.user?.role);
    const filter = request.query.includeAll === "true" && canManage ? {} : { status: "published" };
    const exams = await Exam.find(filter)
      .populate("subjectId", "name code stream gradeLevel")
      .sort({ createdAt: -1 })
      .limit(100);
    return response.json({ exams });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch exams." });
  }
}

export async function updateExam(request, response) {
  try {
    const exam = await Exam.findById(request.params.examId);
    if (!exam) return response.status(404).json({ error: "Exam not found." });
    const { title, description, type, subjectId, chapterIds, questionIds, durationMinutes, passingScore, accessLevel, randomizeQuestions, randomizeOptions } = request.body;
    const nextSubjectId = subjectId || String(exam.subjectId);
    const nextQuestionIds = questionIds === undefined ? exam.questionIds.map(String) : [...new Set(questionIds.map(String))];
    if (!title && title !== undefined || !mongoose.isValidObjectId(nextSubjectId) || !Array.isArray(nextQuestionIds) || !nextQuestionIds.length || !nextQuestionIds.every((id) => mongoose.isValidObjectId(id))) {
      return response.status(400).json({ error: "Title, an active subject, and at least one valid question are required." });
    }
    const subject = await Subject.findOne({ _id: nextSubjectId, isActive: true }).lean();
    const questions = await Question.find({ _id: { $in: nextQuestionIds }, subjectId: nextSubjectId, isActive: true }).select("_id").lean();
    if (!subject || questions.length !== nextQuestionIds.length) return response.status(400).json({ error: "All questions must be active and belong to the selected subject." });
    const updates = { subjectId: nextSubjectId, questionIds: nextQuestionIds };
    for (const [key, value] of Object.entries({ title, description, type, chapterIds, durationMinutes, passingScore, accessLevel, randomizeQuestions, randomizeOptions })) {
      if (value !== undefined) updates[key] = value;
    }
    const updated = await Exam.findByIdAndUpdate(request.params.examId, updates, { new: true, runValidators: true });
    return response.json({ exam: updated });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to update exam." });
  }
}

export async function createExam(request, response) {
  try {
    const {
      title,
      description,
      type,
      subjectId,
      chapterIds,
      questionIds,
      durationMinutes,
      passingScore,
      accessLevel,
      randomizeQuestions,
      randomizeOptions
    } = request.body;

    if (
      !title ||
      !mongoose.isValidObjectId(subjectId) ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0 ||
      !questionIds.every((id) => mongoose.isValidObjectId(id)) ||
      !durationMinutes
    ) {
      return response.status(400).json({ error: "Title, subjectId, questionIds, and durationMinutes are required." });
    }

    const subject = await Subject.findOne({ _id: subjectId, isActive: true }).lean();
    if (!subject) {
      return response.status(400).json({ error: "An active subject is required." });
    }

    const uniqueQuestionIds = [...new Set(questionIds.map(String))];
    const questions = await Question.find({
      _id: { $in: uniqueQuestionIds },
      subjectId,
      isActive: true
    }).select("_id").lean();
    if (questions.length !== uniqueQuestionIds.length) {
      return response.status(400).json({ error: "All questions must be active and belong to the selected subject." });
    }

    const exam = await Exam.create({
      title: String(title).trim(),
      description,
      type,
      subjectId,
      chapterIds: Array.isArray(chapterIds) ? chapterIds : [],
      questionIds,
      durationMinutes,
      passingScore,
      accessLevel,
      randomizeQuestions,
      randomizeOptions,
      createdBy: request.user?._id
    });

    return response.status(201).json({ exam });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to create exam." });
  }
}

export async function publishExam(request, response) {
  try {
    const exam = await Exam.findById(request.params.examId);
    if (!exam) {
      return response.status(404).json({ error: "Exam not found." });
    }

    const subject = await Subject.findOne({ _id: exam.subjectId, isActive: true }).lean();
    const questionIds = [...new Set(exam.questionIds.map(String))];
    const questions = await Question.find({
      _id: { $in: questionIds },
      subjectId: exam.subjectId,
      isActive: true
    }).select("_id chapterId").lean();

    if (!subject || questions.length !== questionIds.length) {
      return response.status(400).json({ error: "Exam requires an active subject and active questions from that subject." });
    }

    if (exam.chapterIds.length > 0) {
      const chapters = await Chapter.find({
        _id: { $in: exam.chapterIds },
        subjectId: exam.subjectId,
        isActive: true
      }).select("_id").lean();
      if (chapters.length !== exam.chapterIds.length) {
        return response.status(400).json({ error: "All exam chapters must be active and belong to the subject." });
      }
    }

    exam.status = "published";
    await exam.save();
    return response.json({ exam });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to publish exam." });
  }
}

export async function archiveExam(request, response) {
  try {
    const exam = await Exam.findByIdAndUpdate(
      request.params.examId,
      { status: "archived" },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return response.status(404).json({ error: "Exam not found." });
    }

    return response.json({ exam });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to archive exam." });
  }
}

export async function restoreExam(request, response) {
  try {
    const exam = await Exam.findByIdAndUpdate(request.params.examId, { status: "draft" }, { new: true, runValidators: true });
    if (!exam) return response.status(404).json({ error: "Exam not found." });
    return response.json({ exam });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to restore exam." });
  }
}

export async function startExamAttempt(request, response) {
  try {
    const { examId } = request.params;
    const exam = await Exam.findOne({ _id: examId, status: "published" });

    if (!exam) {
      return response.status(404).json({ error: "Exam not found." });
    }

    if (exam.accessLevel === "premium") {
      const activeSubscription = await Subscription.exists({
        userId: request.user._id,
        status: "active",
        endsAt: { $gt: new Date() }
      });

      if (!activeSubscription) {
        return response.status(403).json({ error: "An active subscription is required for this exam." });
      }
    }

    const attempt = await ExamAttempt.create({
      userId: request.user._id,
      examId,
      status: "in_progress"
    });

    const questionsRaw = await Question.find({ _id: { $in: exam.questionIds } })
      .select("-correctAnswer")
      .lean();

    // Normalise options to {key, text} objects for the frontend renderer
    const questions = questionsRaw.map((q) => ({
      ...q,
      options: (q.options || []).map((opt, idx) =>
        (() => {
          const key = typeof opt === "object" && opt !== null && opt.key
            ? String(opt.key)
            : String.fromCharCode(65 + idx);
          return {
            ...(typeof opt === "object" && opt !== null ? opt : { text: String(opt) }),
            key,
            imageUrl: opt?.imageUrl || q.optionImages?.[key] || undefined
          };
        })()
      )
    }));

    return response.status(201).json({ attempt, exam: { ...exam.toObject(), questions } });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to start exam attempt." });
  }
}

export async function submitExamAttempt(request, response) {
  try {
    const { attemptId } = request.params;
    const { answers } = request.body;

    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId: request.user._id });

    if (!attempt) {
      return response.status(404).json({ error: "Exam attempt not found." });
    }

    if (attempt.status !== "in_progress") {
      return response.status(409).json({ error: "This exam attempt has already been submitted." });
    }

    if (!Array.isArray(answers)) {
      return response.status(400).json({ error: "answers must be an array." });
    }

    const exam = await Exam.findById(attempt.examId).select("questionIds passingScore");
    if (!exam) {
      return response.status(404).json({ error: "Exam not found." });
    }

    const questions = await Question.find({ _id: { $in: exam.questionIds } })
      .select("correctAnswer options")
      .lean();
    const questionsById = new Map(questions.map((question) => [String(question._id), question]));

    const gradedAnswers = answers.map((answer) => {
      const question = questionsById.get(String(answer.questionId));
      const submittedAnswer = answer.selectedOptionKeys?.[0] ?? answer.response;
      const isCorrect = Boolean(
        question &&
        submittedAnswer !== undefined &&
        String(submittedAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
      );

      return {
        questionId: answer.questionId,
        selectedOptionKeys: Array.isArray(answer.selectedOptionKeys) ? answer.selectedOptionKeys : [],
        response: answer.response,
        isCorrect,
        pointsAwarded: isCorrect ? 1 : 0,
        answeredAt: answer.answeredAt || new Date()
      };
    });

    const score = gradedAnswers.reduce((total, answer) => total + answer.pointsAwarded, 0);
    const percentage = questions.length ? Math.round((score / questions.length) * 10000) / 100 : 0;

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.passed = percentage >= exam.passingScore;
    attempt.status = "submitted";
    attempt.submittedAt = new Date();

    await attempt.save();
    const gradedAnswersById = new Map(
      gradedAnswers.map((answer) => [String(answer.questionId), answer])
    );
    const questionResults = exam.questionIds.map((questionId) => {
      const question = questionsById.get(String(questionId));
      const gradedAnswer = gradedAnswersById.get(String(questionId));
      const selectedAnswer = gradedAnswer?.selectedOptionKeys?.[0] ?? gradedAnswer?.response;
      const options = question?.options || [];
      const optionText = (key) => {
        const index = options.findIndex((option, optionIndex) =>
          typeof option === "object" && option !== null && option.key
            ? String(option.key) === String(key)
            : String.fromCharCode(65 + optionIndex) === String(key)
        );
        if (index < 0) return undefined;
        const option = options[index];
        return typeof option === "object" ? option.text || option.label : String(option);
      };

      return {
        questionId,
        selectedAnswer,
        selectedAnswerText: optionText(selectedAnswer) || selectedAnswer,
        correctAnswer: question?.correctAnswer,
        correctAnswerText: optionText(question?.correctAnswer) || question?.correctAnswer,
        isCorrect: Boolean(gradedAnswer?.isCorrect)
      };
    });

    return response.json({
      attempt: {
        ...attempt.toObject(),
        totalMarks: questions.length,
        questionResults
      }
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to submit exam attempt." });
  }
}
