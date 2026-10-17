import { Chapter } from "../models/Chapter.js";
import { Question } from "../models/Question.js";
import { Subject } from "../models/Subject.js";

export async function getSubjects(request, response) {
  try {
    const filter = { isActive: true };
    if (request.query.stream && ["natural", "social"].includes(request.query.stream)) {
      filter.$or = [{ stream: request.query.stream }, { stream: "both" }];
    }
    const subjects = await Subject.find(filter).sort({ name: 1 });
    return response.json({ subjects });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch subjects." });
  }
}

export async function createSubject(request, response) {
  try {
    const { name, code, description, gradeLevel, stream = "both" } = request.body;

    if (!name || !code) {
      return response.status(400).json({ error: "Subject name and code are required." });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const existing = await Subject.findOne({ code: normalizedCode });

    if (existing) {
      return response.status(409).json({ error: "A subject with that code already exists." });
    }

    const subject = await Subject.create({
      name: String(name).trim(),
      code: normalizedCode,
      description,
      gradeLevel,
      stream: ["natural", "social", "both"].includes(stream) ? stream : "both",
      isActive: true
    });

    return response.status(201).json({ subject });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to create subject." });
  }
}

export async function deactivateSubject(request, response) {
  try {
    const subject = await Subject.findByIdAndUpdate(
      request.params.subjectId,
      { isActive: false },
      { new: true, runValidators: true }
    );
    if (!subject) {
      return response.status(404).json({ error: "Subject not found." });
    }

    await Chapter.updateMany({ subjectId: subject._id }, { isActive: false });
    await Question.updateMany({ subjectId: subject._id }, { isActive: false });
    return response.json({ subject });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to deactivate subject." });
  }
}

export async function getChaptersBySubject(request, response) {
  try {
    const { subjectId } = request.params;
    const chapters = await Chapter.find({ subjectId, isActive: true }).sort({ order: 1, title: 1 });
    return response.json({ chapters });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch chapters." });
  }
}

export async function createChapter(request, response) {
  try {
    const { subjectId } = request.params;
    const { title, description, order } = request.body;

    if (!title) {
      return response.status(400).json({ error: "Chapter title is required." });
    }

    const subject = await Subject.findOne({ _id: subjectId, isActive: true });
    if (!subject || !subject.isActive) {
      return response.status(404).json({ error: "Subject not found." });
    }

    const chapter = await Chapter.create({
      subjectId,
      title: String(title).trim(),
      description,
      order: Number(order) || 1
    });

    return response.status(201).json({ chapter });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to create chapter." });
  }
}

export async function deactivateChapter(request, response) {
  try {
    const chapter = await Chapter.findByIdAndUpdate(
      request.params.chapterId,
      { isActive: false },
      { new: true, runValidators: true }
    );
    if (!chapter) {
      return response.status(404).json({ error: "Chapter not found." });
    }

    await Question.updateMany({ chapterId: chapter._id }, { isActive: false });
    return response.json({ chapter });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to deactivate chapter." });
  }
}

export async function getQuestions(request, response) {
  try {
    const { subjectId, chapterId } = request.query;
    const filter = { isActive: true };

    if (subjectId) filter.subjectId = subjectId;
    if (chapterId) filter.chapterId = chapterId;

    const questionQuery = Question.find(filter).sort({ createdAt: -1 }).limit(200);
    if (request.user.role === "student") {
      questionQuery.select("-correctAnswer");
    }

    const questions = await questionQuery;
    return response.json({ questions });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch questions." });
  }
}

export async function createQuestion(request, response) {
  try {
    const { subjectId, chapterId, prompt, options, correctAnswer, explanation, difficulty, questionType, tags } = request.body;

    if (!subjectId || !prompt || !correctAnswer) {
      return response.status(400).json({ error: "Subject ID, prompt, and correctAnswer are required." });
    }

    const subject = await Subject.findOne({ _id: subjectId, isActive: true });
    if (!subject || !subject.isActive) {
      return response.status(404).json({ error: "Subject not found." });
    }

    if (chapterId) {
      const chapter = await Chapter.findOne({ _id: chapterId, subjectId, isActive: true });
      if (!chapter) {
        return response.status(400).json({ error: "Chapter must belong to the active subject." });
      }
    }

    const normalizedQuestionType = questionType || "multiple_choice";
    const normalizedOptions = Array.isArray(options)
      ? options.map((option) => String(option).trim()).filter(Boolean)
      : [];
    if (normalizedQuestionType === "multiple_choice" && normalizedOptions.length < 2) {
      return response.status(400).json({ error: "Multiple-choice questions require at least two options." });
    }

    const question = await Question.create({
      subjectId,
      chapterId,
      prompt,
      options: normalizedOptions,
      correctAnswer: String(correctAnswer).trim(),
      explanation,
      difficulty,
      questionType: normalizedQuestionType,
      tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim().toLowerCase()) : [],
      createdBy: request.user?._id,
      isActive: true
    });

    return response.status(201).json({ question });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to create question." });
  }
}

export async function deactivateQuestion(request, response) {
  try {
    const question = await Question.findByIdAndUpdate(
      request.params.questionId,
      { isActive: false },
      { new: true, runValidators: true }
    );
    if (!question) {
      return response.status(404).json({ error: "Question not found." });
    }

    return response.json({ question });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to deactivate question." });
  }
}
