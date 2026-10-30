import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRequestForSwCache,
  buildExamStartCacheKey,
  synthesizeOfflineExamStart,
  gradeOfflineExamAttempt
} from "./offlineExamEngine.js";

describe("offlineExamEngine", () => {
  it("classifies static precache, static assets, API GETs, and exam POSTs accurately", () => {
    assert.equal(classifyRequestForSwCache("GET", "/"), "static-precache");
    assert.equal(classifyRequestForSwCache("GET", "/manifest.webmanifest"), "static-precache");
    assert.equal(classifyRequestForSwCache("GET", "/assets/index-abc123.js"), "static-asset");
    assert.equal(classifyRequestForSwCache("GET", "/css2", "fonts.googleapis.com"), "static-asset");
    assert.equal(classifyRequestForSwCache("GET", "/api/exams"), "api-get");
    assert.equal(classifyRequestForSwCache("GET", "/api/question-bank/subjects/123/chapters"), "api-get");
    assert.equal(classifyRequestForSwCache("POST", "/api/exams/65f123/start"), "exam-start-post");
    assert.equal(classifyRequestForSwCache("POST", "/api/exams/attempts/att_1/submit"), "exam-submit-post");
    assert.equal(classifyRequestForSwCache("POST", "/api/auth/login"), "auth-post");
    assert.equal(classifyRequestForSwCache("DELETE", "/api/notes/123"), "bypass");
  });

  it("builds deterministic synthetic cache keys for exam start sessions", () => {
    assert.equal(buildExamStartCacheKey("exam_101"), "/__sw_exam_start__/exam_101");
    assert.equal(
      buildExamStartCacheKey("exam_101", { chapterId: "ch_5", allYears: true }),
      "/__sw_exam_start__/exam_101?chapterId=ch_5&allYears=true"
    );
  });

  it("synthesizes an offline exam session from cached bundle data", () => {
    const bundle = {
      exams: [
        {
          _id: "ex_math_2017",
          title: "Mathematics 2017 E.C. Entrance Exam",
          examYear: 2017,
          passingScore: 50,
          subjectId: { _id: "sub_math", name: "Mathematics" },
          questionIds: ["q1", "q2"]
        }
      ],
      chapters: [{ _id: "ch_calc", title: "Unit 2: Calculus", order: 2 }],
      questions: [
        {
          _id: "q1",
          examId: "ex_math_2017",
          subjectId: "sub_math",
          chapterId: "ch_calc",
          prompt: "What is d/dx (x^2)?",
          correctAnswer: "B",
          options: [
            { key: "A", text: "x" },
            { key: "B", text: "2x" }
          ]
        },
        {
          _id: "q2",
          examId: "ex_math_2017",
          subjectId: "sub_math",
          chapterId: "ch_calc",
          prompt: "What is integral of 2x dx?",
          correctAnswer: "A",
          options: [
            { key: "A", text: "x^2 + C" },
            { key: "B", text: "2x^2 + C" }
          ]
        }
      ]
    };

    const fullSession = synthesizeOfflineExamStart(bundle, "ex_math_2017");
    assert.ok(fullSession);
    assert.equal(fullSession.attempt.offline, true);
    assert.equal(fullSession.exam.questions.length, 2);
    assert.equal(fullSession.exam.questions[0].prompt, "What is d/dx (x^2)?");

    const chapterSession = synthesizeOfflineExamStart(bundle, "ex_math_2017", {
      chapterId: "ch_calc",
      allYears: true
    });
    assert.equal(chapterSession.exam.title, "Unit 2: Calculus (All Years)");
    assert.equal(chapterSession.exam.questions.length, 2);
  });

  it("grades offline exam attempts and computes questionResults with explanations", () => {
    const questions = [
      {
        _id: "q1",
        correctAnswer: "B",
        explanation: "Power rule: d/dx(x^2) = 2x",
        options: [
          { key: "A", text: "x" },
          { key: "B", text: "2x" }
        ]
      },
      {
        _id: "q2",
        correctAnswer: "A",
        explanation: "Antiderivative of 2x is x^2 + C",
        options: [
          { key: "A", text: "x^2 + C" },
          { key: "B", text: "2x^2 + C" }
        ]
      }
    ];

    const result = gradeOfflineExamAttempt(
      questions,
      [
        { questionId: "q1", selectedOptionKeys: ["B"], response: "B" },
        { questionId: "q2", selectedOptionKeys: ["B"], response: "B" }
      ],
      50
    );

    assert.equal(result.score, 1);
    assert.equal(result.totalMarks, 2);
    assert.equal(result.percentage, 50);
    assert.equal(result.passed, true);
    assert.equal(result.questionResults.length, 2);
    assert.equal(result.questionResults[0].isCorrect, true);
    assert.equal(result.questionResults[0].selectedAnswerText, "2x");
    assert.equal(result.questionResults[1].isCorrect, false);
    assert.equal(result.questionResults[1].correctAnswerText, "x^2 + C");
  });
});
