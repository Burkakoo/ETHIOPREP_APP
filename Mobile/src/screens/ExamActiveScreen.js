import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { request } from "../services/api.js";
import { Icon } from "../components/Icon.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

const FAVORITES_KEY = "ethioprep_favorite_questions";

const SUPERSCRIPTS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", "n": "ⁿ", "x": "ˣ" };

function formatMath(value = "") {
  return String(value)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\int_\{?([^{}]+)\}?\^\{?([^{}]+)\}?/g, "∫_$1^$2")
    .replace(/\\(pi|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega|times|cdot|leq|geq|neq)/g, (_match, symbol) => ({
      pi: "π", theta: "θ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", lambda: "λ", mu: "μ",
      sigma: "σ", omega: "ω", times: "×", cdot: "·", leq: "≤", geq: "≥", neq: "≠"
    }[symbol]))
    .replace(/\^\{([^{}]+)\}/g, (_match, power) => [...power].map(char => SUPERSCRIPTS[char] || char).join(""))
    .replace(/_\{([^{}]+)\}/g, (_match, subscript) => `₍${subscript}₎`)
    .replace(/\^([0-9nx+\-()=])/g, (_match, power) => SUPERSCRIPTS[power] || power);
}

function MathText({ children, style }) {
  return <Text style={style}>{formatMath(children)}</Text>;
}

function QuestionDiagram({ uri, style }) {
  const [aspectRatio, setAspectRatio] = useState(1);

  return (
    <Image
      source={{ uri }}
      resizeMode="contain"
      onLoad={({ nativeEvent }) => {
        const { width, height } = nativeEvent.source || {};
        if (width && height) setAspectRatio(width / height);
      }}
      style={[styles.questionDiagram, style, { aspectRatio }]}
    />
  );
}

export function ExamActiveScreen({ examData, onSubmit, onExit, submitting }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [filterMistakesOnly, setFilterMistakesOnly] = useState(false);

  useEffect(() => {
    // 1. Load from AsyncStorage
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((val) => {
        if (val) setFavorites(JSON.parse(val));
      })
      .catch(() => {});

    // 2. Sync from backend database
    request("/bookmarks")
      .then((data) => {
        if (data?.bookmarks && Array.isArray(data.bookmarks)) {
          const map = {};
          data.bookmarks.forEach((b) => {
            map[b.questionId || b.prompt] = b;
          });
          setFavorites((prev) => ({ ...prev, ...map }));
          AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(map)).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  async function toggleFavorite(question) {
    const qId = question._id || question.prompt;
    const isCurrentlyFav = Boolean(favorites[qId]);
    const nextFavorites = { ...favorites };

    if (isCurrentlyFav) {
      delete nextFavorites[qId];
      setFavorites(nextFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
      // Delete from backend database
      request(`/bookmarks/${qId}`, { method: "DELETE" }).catch(() => {});
    } else {
      const favObj = {
        _id: qId,
        questionId: question._id,
        prompt: question.prompt,
        options: question.options,
        explanation: question.explanation,
        correctAnswer: question.correctAnswer,
        savedAt: new Date().toISOString()
      };
      nextFavorites[qId] = favObj;
      setFavorites(nextFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
      // Save to backend database
      request("/bookmarks", {
        method: "POST",
        body: JSON.stringify(favObj)
      }).catch(() => {});
    }
  }

  const exam = examData?.exam;
  const attempt = examData?.attempt;
  const questions = exam?.questions || [];
  const resultByQuestionId = new Map(
    (result?.questionResults || []).map((item) => [String(item.questionId), item])
  );

  function handleSelectOption(questionId, optionKey) {
    if (result) return; // locked after submission
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey
    }));
  }

  async function handleSubmit() {
    const formattedAnswers = Object.entries(answers).map(([questionId, selected]) => ({
      questionId,
      selectedOptionKeys: [selected]
    }));

    const response = await onSubmit(attempt._id, formattedAnswers);
    if (response?.attempt) {
      setResult(response.attempt);
    }
  }

  const answeredCount = Object.keys(answers).length;

  // Compute question correctness if result available
  const questionsWithStatus = questions.map((q) => {
    const userSelected = answers[q._id];
    const review = resultByQuestionId.get(String(q._id));
    const isCorrect = review ? review.isCorrect : true;
    return { ...q, userSelected, isCorrect, review };
  });

  const displayedQuestions = filterMistakesOnly
    ? questionsWithStatus.filter((q) => !q.isCorrect)
    : questionsWithStatus;

  const mistakesCount = questionsWithStatus.filter((q) => !q.isCorrect).length;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
          <Icon color={COLORS.danger} name="close" size={16} />
          <Text style={styles.exitText}>Exit Exam</Text>
        </TouchableOpacity>
        <Text style={styles.progressCounter}>
          {answeredCount}/{questions.length} Answered
        </Text>
      </View>

      <Text style={styles.examTitle}>{exam?.title || "Active Examination"}</Text>

      {result && (
        <Card style={styles.resultCard}>
          <Text style={styles.resultTitle}>Exam Completed</Text>
          <Text style={styles.scoreNumber}>{result.percentage}%</Text>
          <Text
            style={[
              styles.passBadge,
              result.passed ? styles.passed : styles.failed
            ]}
          >
            {result.passed ? "PASSED" : "NEEDS IMPROVEMENT"}
          </Text>
          <Text style={styles.resultDetails}>
            Score: {result.score} / {result.totalMarks} points
          </Text>

          {/* Review Mistakes Button */}
          <View style={styles.reviewFilterRow}>
            <TouchableOpacity
              onPress={() => setFilterMistakesOnly(false)}
              style={[
                styles.reviewFilterBtn,
                !filterMistakesOnly && styles.activeReviewFilter
              ]}
            >
              <Text
                style={[
                  styles.reviewFilterText,
                  !filterMistakesOnly && styles.activeReviewFilterText
                ]}
              >
                All Questions ({questions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterMistakesOnly(true)}
              style={[
                styles.reviewFilterBtn,
                filterMistakesOnly && styles.activeReviewFilter
              ]}
            >
              <Text
                style={[
                  styles.reviewFilterText,
                  filterMistakesOnly && styles.activeReviewFilterText
                ]}
              >
                Review Mistakes ({mistakesCount})
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {displayedQuestions.map((question, index) => {
        const selected = answers[question._id];
        const isFav = Boolean(favorites[question._id || question.prompt]);

        return (
          <Card key={question._id || index} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.qNumBadge}>
                  <Text style={styles.qNumText}>Q{index + 1}</Text>
                </View>
                {question.topic ? (
                  <Text style={styles.topicText}>{question.topic}</Text>
                ) : null}
              </View>

              {/* Save Favorite Question / Bookmark */}
              <TouchableOpacity
                onPress={() => toggleFavorite(question)}
                style={[styles.favBtn, isFav && styles.favBtnActive]}
              >
                <Icon color={COLORS.gold} name={isFav ? "star" : "star-outline"} size={14} />
                <Text style={[styles.favBtnText, isFav && styles.favBtnTextActive]}>
                  {isFav ? "Saved" : "Save Favorite"}
                </Text>
              </TouchableOpacity>
            </View>

            {result && (
              <View
                style={[
                  styles.statusTag,
                  question.isCorrect ? styles.statusCorrect : styles.statusIncorrect
                ]}
              >
                <Icon
                  color={question.isCorrect ? COLORS.success : COLORS.danger}
                  name={question.isCorrect ? "checkmark-circle" : "close-circle"}
                  size={15}
                />
                <Text
                  style={[
                    styles.statusTagText,
                    question.isCorrect ? styles.textSuccess : styles.textDanger
                  ]}
                >
                  {question.isCorrect ? "Correct" : "Mistake / Incorrect"}
                </Text>
              </View>
            )}

            <MathText style={styles.prompt}>{question.prompt}</MathText>
            {question.imageUrl ? <QuestionDiagram uri={question.imageUrl} /> : null}

            <View style={styles.optionsList}>
              {(question.options || []).map((option) => {
                const isSelected = selected === option.key;
                const isTheCorrectAnswer = result && question.review?.correctAnswer === option.key;
                const isUserMistake = result && isSelected && !question.isCorrect;

                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={option.key}
                    onPress={() => handleSelectOption(question._id, option.key)}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      isTheCorrectAnswer && styles.correctOptionRow,
                      isUserMistake && styles.incorrectOptionRow
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                        isTheCorrectAnswer && styles.radioCorrect,
                        isUserMistake && styles.radioMistake
                      ]}
                    >
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                        isTheCorrectAnswer && styles.labelCorrect
                      ]}
                    >
                      {option.key}.
                    </Text>
                    <MathText
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isTheCorrectAnswer && styles.textCorrectAnswer
                      ]}
                    >
                      {option.text || option.label}
                    </MathText>
                    {option.imageUrl ? <QuestionDiagram uri={option.imageUrl} style={styles.optionDiagram} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {result && question.review && !question.review.isCorrect ? (
              <View style={styles.answerReviewBox}>
                <Text style={styles.answerReviewTitle}>Review your answer</Text>
                <MathText style={styles.incorrectAnswerText}>
                  Your answer: {question.review.selectedAnswerText || "Not answered"}
                </MathText>
                <MathText style={styles.correctAnswerText}>
                  Correct answer: {question.review.correctAnswerText || question.review.correctAnswer}
                </MathText>
              </View>
            ) : null}

            {result && (question.explanation || question.explanationImageUrl) ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>Explanation:</Text>
                {question.explanation ? <MathText style={styles.explanationContent}>{question.explanation}</MathText> : null}
                {question.explanationImageUrl ? <QuestionDiagram uri={question.explanationImageUrl} /> : null}
              </View>
            ) : null}
          </Card>
        );
      })}

      {!result ? (
        <Button
          disabled={questions.length === 0}
          loading={submitting}
          onPress={handleSubmit}
          style={styles.submitBtn}
        >
          Submit Examination ({answeredCount}/{questions.length})
        </Button>
      ) : (
        <Button onPress={onExit} style={styles.submitBtn} variant="secondary">
          Back to Practice Exams
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl * 2
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg
  },
  exitText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 13
  },
  progressCounter: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  examTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  resultCard: {
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: "900",
    color: COLORS.primary,
    marginVertical: 4
  },
  passBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: SPACING.sm
  },
  passed: {
    backgroundColor: COLORS.successBg,
    color: COLORS.success
  },
  failed: {
    backgroundColor: COLORS.dangerBg,
    color: COLORS.danger
  },
  resultDetails: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  questionCard: {
    marginBottom: SPACING.md
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm
  },
  qNumBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  qNumText: {
    color: COLORS.onPrimary,
    fontWeight: "800",
    fontSize: 11
  },
  topicText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600"
  },
  prompt: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.md
  },
  questionDiagram: {
    width: "100%",
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm
  },
  optionDiagram: {
    flexBasis: 90,
    width: 90,
    maxHeight: 90,
    marginBottom: 0,
    marginLeft: SPACING.sm
  },
  optionsList: {
    gap: SPACING.sm
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  optionRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceMuted
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm
  },
  radioCircleSelected: {
    borderColor: COLORS.primary
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textMuted,
    marginRight: 6
  },
  optionLabelSelected: {
    color: COLORS.primary
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1
  },
  optionTextSelected: {
    fontWeight: "700",
    color: COLORS.primary
  },
  explanationBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.warning,
    marginBottom: 2
  },
  explanationContent: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18
  },
  answerReviewBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.md,
    gap: 4
  },
  answerReviewTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.danger
  },
  incorrectAnswerText: {
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 18
  },
  correctAnswerText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: "700",
    lineHeight: 18
  },
  submitBtn: {
    marginTop: SPACING.md
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm
  },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  favBtnActive: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning
  },
  favBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  favBtnTextActive: {
    color: COLORS.warning
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
    marginBottom: SPACING.sm
  },
  statusCorrect: {
    backgroundColor: COLORS.successBg
  },
  statusIncorrect: {
    backgroundColor: COLORS.dangerBg
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: "800"
  },
  textSuccess: {
    color: COLORS.success
  },
  textDanger: {
    color: COLORS.danger
  },
  correctOptionRow: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg
  },
  incorrectOptionRow: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg
  },
  radioCorrect: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success
  },
  radioMistake: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger
  },
  labelCorrect: {
    color: COLORS.success
  },
  textCorrectAnswer: {
    color: COLORS.success,
    fontWeight: "700"
  },
  reviewFilterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md
  },
  reviewFilterBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center"
  },
  activeReviewFilter: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  reviewFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  activeReviewFilterText: {
    color: COLORS.onPrimary
  }
});
