import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function ExamsScreen({ exams = [], onStartExam, loadingExamId, user }) {
  const userStream = user?.stream || "natural";
  const isNatural = userStream === "natural";

  const streamFilteredExams = exams.filter((exam) => {
    const subjStream = exam.subjectId?.stream;
    const subjCode = exam.subjectId?.code;

    if (isNatural) {
      if (subjStream) {
        return subjStream === "natural" || subjStream === "both";
      }
      if (subjCode) {
        return ["MATH_NAT", "PHYS", "CHEM", "BIO", "ENG", "APTITUDE", "SAT"].includes(subjCode);
      }
      const t = (exam.title || "").toLowerCase();
      if (t.includes("social") || t.includes("history") || t.includes("geography") || t.includes("economics")) {
        return false;
      }
      return true;
    } else {
      if (subjStream) {
        return subjStream === "social" || subjStream === "both";
      }
      if (subjCode) {
        return ["MATH_SOC", "HIST", "GEOG", "ECON", "ENG", "APTITUDE", "SAT"].includes(subjCode);
      }
      const t = (exam.title || "").toLowerCase();
      if (t.includes("physics") || t.includes("chemistry") || t.includes("biology") || t.includes("natural")) {
        return false;
      }
      return true;
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {isNatural ? "🔬 Natural Science Exams" : "📚 Social Science Exams"}
      </Text>
      <Text style={styles.subHeader}>
        Timed simulations based on Ethiopian EUEE blueprints for {isNatural ? "Natural" : "Social"} Science.
      </Text>

      {streamFilteredExams.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No published exams currently available for your stream.</Text>
        </Card>
      ) : (
        streamFilteredExams.map((item) => {
          const isPremium = item.accessLevel === "premium";
          return (
            <Card key={item._id} style={styles.examCard}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.accessBadge,
                    isPremium ? styles.premiumBadge : styles.freeBadge
                  ]}
                >
                  <Text
                    style={[
                      styles.accessBadgeText,
                      isPremium ? styles.premiumBadgeText : styles.freeBadgeText
                    ]}
                  >
                    {isPremium ? "PREMIUM" : "FREE ACCESS"}
                  </Text>
                </View>
                <Text style={styles.durationText}>{item.durationMinutes} minutes</Text>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              {item.description ? (
                <Text numberOfLines={2} style={styles.description}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Passing score: {item.passingScore || 50}%
                </Text>
                <Text style={styles.metaText}>
                  {item.questionIds?.length || 0} questions
                </Text>
              </View>

              <Button
                loading={loadingExamId === item._id}
                onPress={() => onStartExam(item)}
                style={styles.startBtn}
                variant={isPremium ? "secondary" : "primary"}
              >
                Start Practice Exam
              </Button>
            </Card>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4
  },
  subHeader: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md
  },
  examCard: {
    marginBottom: SPACING.md
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm
  },
  accessBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm
  },
  freeBadge: {
    backgroundColor: COLORS.successBg
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success
  },
  premiumBadge: {
    backgroundColor: COLORS.warningBg
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.warning
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    lineHeight: 18
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  startBtn: {
    marginTop: 2
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: SPACING.md
  }
});
