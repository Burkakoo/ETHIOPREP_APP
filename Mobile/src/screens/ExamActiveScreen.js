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

function formatShortGrade(gradeLevel) {
  if (!gradeLevel) return "";
  const match = String(gradeLevel).match(/grade-(\d+)/i);
  return match ? `G${match[1]}` : String(gradeLevel).toUpperCase();
}

export function ExamActiveScreen({ examData, onSubmit, onExit, submitting }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [filterMistakesOnly, setFilterMistakesOnly] = useState(false);

  // Organize Active Exam by Year & Topic
  const [organizeMode, setOrganizeMode] = useState("year_topic"); // "year_topic" | "sequential"
  const [selectedYearFilter, setSelectedYearFilter] = useState("all");
  const [selectedTopicFilter, setSelectedTopicFilter] = useState("all");

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
    if (result) return;
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

  // Compute question correctness and normalized Year + Topic fields
  const questionsWithStatus = questions.map((q, idx) => {
    const userSelected = answers[q._id];
    const review = resultByQuestionId.get(String(q._id));
    const isCorrect = review ? review.isCorrect : true;
    const resolvedYear = String(q.examYear || exam?.examYear || "2016");
    const resolvedTopic = q.chapterTitle || q.topic || exam?.chapterName || "General Curriculum Topic";
    const resolvedGrade = formatShortGrade(q.gradeLevel);
    return {
      ...q,
      originalIndex: idx + 1,
      userSelected,
      isCorrect,
      review,
      resolvedYear,
      resolvedTopic,
      resolvedGrade
    };
  });

  // Extract distinct Years and Topics in this Active Exam
  const yearOptions = Array.from(
    new Set(questionsWithStatus.map((q) => q.resolvedYear))
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const topicOptionsMap = new Map();
  questionsWithStatus.forEach((q) => {
    if (selectedYearFilter !== "all" && q.resolvedYear !== selectedYearFilter) return;
    const key = q.resolvedTopic;
    if (!topicOptionsMap.has(key)) {
      topicOptionsMap.set(key, {
        topic: key,
        grade: q.resolvedGrade,
        count: 0
      });
    }
    topicOptionsMap.get(key).count += 1;
  });
  const topicOptions = Array.from(topicOptionsMap.values());

  const filteredQuestions = questionsWithStatus.filter((q) => {
    if (filterMistakesOnly && q.isCorrect) return false;
    if (selectedYearFilter !== "all" && q.resolvedYear !== selectedYearFilter) return false;
    if (selectedTopicFilter !== "all" && q.resolvedTopic !== selectedTopicFilter) return false;
    return true;
  });

  // Group filteredQuestions by Year + Topic when organizeMode === "year_topic"
  const groupedYearTopicSections = [];
  if (organizeMode === "year_topic") {
    const groupMap = new Map();
    filteredQuestions.forEach((q) => {
      const groupKey = `${q.resolvedYear}__${q.resolvedTopic}`;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          year: q.resolvedYear,
          topic: q.resolvedTopic,
          grade: q.resolvedGrade,
          items: []
        });
      }
      groupMap.get(groupKey).items.push(q);
    });
    groupedYearTopicSections.push(...groupMap.values());
  }

  const mistakesCount = questionsWithStatus.filter((q) => !q.isCorrect).length;

  function renderQuestionCard(question) {
    const selected = answers[question._id];
    const isFav = Boolean(favorites[question._id || question.prompt]);

    return (
      <Card key={question._id || question.originalIndex} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.qNumBadge}>
              <Text style={styles.qNumText}>Q{question.originalIndex}</Text>
            </View>
            <View style={styles.yearTagPill}>
              <Text style={styles.yearTagPillText}>{question.resolvedYear} E.C.</Text>
            </View>
            {question.resolvedGrade ? (
              <View style={styles.gradeTagPill}>
                <Text style={styles.gradeTagPillText}>{question.resolvedGrade}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => toggleFavorite(question)}
            style={[styles.favBtn, isFav && styles.favBtnActive]}
          >
            <Icon color={COLORS.gold} name={isFav ? "star" : "star-outline"} size={14} />
            <Text style={[styles.favBtnText, isFav && styles.favBtnTextActive]}>
              {isFav ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topicBannerRow}>
          <Icon color={COLORS.primaryDark} name="layers-outline" size={13} />
          <Text numberOfLines={1} style={styles.topicText}>
            {question.resolvedTopic}
          </Text>
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

        {result && (question.explanation || question.review?.explanation || question.explanationImageUrl) ? (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            {question.explanation || question.review?.explanation ? (
              <MathText style={styles.explanationContent}>
                {question.explanation || question.review?.explanation}
              </MathText>
            ) : null}
            {question.explanationImageUrl ? <QuestionDiagram uri={question.explanationImageUrl} /> : null}
          </View>
        ) : null}
      </Card>
    );
  }

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

      {/* Active Exam Organize by Year & Topic Control Bar */}
      <Card style={styles.organizeCard}>
        <View style={styles.organizeModeRow}>
          <TouchableOpacity
            onPress={() => setOrganizeMode("year_topic")}
            style={[
              styles.organizeModeBtn,
              organizeMode === "year_topic" && styles.organizeModeBtnActive
            ]}
          >
            <Icon
              color={organizeMode === "year_topic" ? COLORS.onPrimary : COLORS.primary}
              name="layers-outline"
              size={14}
            />
            <Text
              style={[
                styles.organizeModeText,
                organizeMode === "year_topic" && styles.organizeModeTextActive
              ]}
            >
              By Year &amp; Topic ({groupedYearTopicSections.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOrganizeMode("sequential")}
            style={[
              styles.organizeModeBtn,
              organizeMode === "sequential" && styles.organizeModeBtnActive
            ]}
          >
            <Icon
              color={organizeMode === "sequential" ? COLORS.onPrimary : COLORS.primary}
              name="list-outline"
              size={14}
            />
            <Text
              style={[
                styles.organizeModeText,
                organizeMode === "sequential" && styles.organizeModeTextActive
              ]}
            >
              Sequential (Q1–Q{questions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Year Filter Pills */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupLabel}>Year:</Text>
          <View style={styles.filterChipsWrap}>
            <TouchableOpacity
              onPress={() => setSelectedYearFilter("all")}
              style={[
                styles.orgChip,
                selectedYearFilter === "all" && styles.orgChipActive
              ]}
            >
              <Text
                style={[
                  styles.orgChipText,
                  selectedYearFilter === "all" && styles.orgChipTextActive
                ]}
              >
                All Years ({questionsWithStatus.length})
              </Text>
            </TouchableOpacity>
            {yearOptions.map((yr) => {
              const count = questionsWithStatus.filter((q) => q.resolvedYear === yr).length;
              const isAct = selectedYearFilter === yr;
              return (
                <TouchableOpacity
                  key={yr}
                  onPress={() => setSelectedYearFilter(yr)}
                  style={[styles.orgChip, isAct && styles.orgChipActive]}
                >
                  <Text style={[styles.orgChipText, isAct && styles.orgChipTextActive]}>
                    {yr} E.C. ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Topic Filter Pills */}
        {topicOptions.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Topic:</Text>
            <View style={styles.filterChipsWrap}>
              <TouchableOpacity
                onPress={() => setSelectedTopicFilter("all")}
                style={[
                  styles.orgChip,
                  selectedTopicFilter === "all" && styles.orgChipActive
                ]}
              >
                <Text
                  style={[
                    styles.orgChipText,
                    selectedTopicFilter === "all" && styles.orgChipTextActive
                  ]}
                >
                  All Topics ({topicOptions.length})
                </Text>
              </TouchableOpacity>
              {topicOptions.map((tp) => {
                const isAct = selectedTopicFilter === tp.topic;
                return (
                  <TouchableOpacity
                    key={tp.topic}
                    onPress={() => setSelectedTopicFilter(tp.topic)}
                    style={[styles.orgChip, isAct && styles.orgChipActive]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.orgChipText, isAct && styles.orgChipTextActive]}
                    >
                      {tp.grade ? `${tp.grade} · ` : ""}{tp.topic.split(":")[0]} ({tp.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </Card>

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

      {organizeMode === "year_topic" ? (
        groupedYearTopicSections.map((section) => (
          <View key={section.key} style={styles.yearTopicSection}>
            <View style={styles.yearTopicSectionHeader}>
              <View style={styles.yearTopicHeaderBadges}>
                <View style={styles.sectionYearBadge}>
                  <Icon color={COLORS.onPrimary} name="calendar" size={12} />
                  <Text style={styles.sectionYearBadgeText}>{section.year} E.C.</Text>
                </View>
                {section.grade ? (
                  <View style={styles.sectionGradeBadge}>
                    <Text style={styles.sectionGradeBadgeText}>{section.grade}</Text>
                  </View>
                ) : null}
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCountBadgeText}>{section.items.length} Qs</Text>
                </View>
              </View>
              <Text style={styles.sectionTopicTitle}>{section.topic}</Text>
            </View>
            {section.items.map((question) => renderQuestionCard(question))}
          </View>
        ))
      ) : (
        filteredQuestions.map((question) => renderQuestionCard(question))
      )}

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
    marginBottom: SPACING.sm
  },
  organizeCard: {
    marginBottom: SPACING.md,
    padding: SPACING.sm
  },
  organizeModeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: SPACING.sm
  },
  organizeModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  organizeModeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  organizeModeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMuted
  },
  organizeModeTextActive: {
    color: COLORS.onPrimary
  },
  filterGroup: {
    marginTop: 6
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    marginBottom: 4
  },
  filterChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  orgChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  orgChipActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary
  },
  orgChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  orgChipTextActive: {
    color: COLORS.primaryDark
  },
  yearTopicSection: {
    marginBottom: SPACING.md
  },
  yearTopicSectionHeader: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary,
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm
  },
  yearTopicHeaderBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4
  },
  sectionYearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  sectionYearBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: "800"
  },
  sectionGradeBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionGradeBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "800"
  },
  sectionCountBadge: {
    marginLeft: "auto",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full
  },
  sectionCountBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800"
  },
  sectionTopicTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primaryDark
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
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 6
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
  yearTagPill: {
    backgroundColor: "#E0E7FF",
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  yearTagPillText: {
    color: "#1E40AF",
    fontWeight: "800",
    fontSize: 10
  },
  gradeTagPill: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  gradeTagPillText: {
    color: COLORS.primaryDark,
    fontWeight: "800",
    fontSize: 10
  },
  topicBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm
  },
  topicText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: "700",
    flex: 1
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
    gap: 6,
    flexWrap: "wrap",
    flex: 1
  },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 30,
    paddingHorizontal: SPACING.sm,
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
