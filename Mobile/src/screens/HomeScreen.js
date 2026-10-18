import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { EmptyState } from "../components/EmptyState.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function HomeScreen({ user, subjects = [], onSelectSubject, onNavigateTab }) {
  // Lock strictly to the student's registered stream
  const userStream = user?.stream || "natural";
  const isNatural = userStream === "natural";

  const filteredSubjects = subjects.filter((subj) => {
    if (isNatural) {
      return (
        ["MATH_NAT", "PHYS", "CHEM", "BIO", "ENG", "APTITUDE", "SAT"].includes(subj.code) ||
        subj.stream === "natural" ||
        subj.stream === "both"
      );
    }
    // Social Science
    return (
      ["MATH_SOC", "HIST", "GEOG", "ECON", "ENG", "APTITUDE", "SAT"].includes(subj.code) ||
      subj.stream === "social" ||
      subj.stream === "both"
    );
  });

  return (
    <View style={styles.container}>
      <Card style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.greeting}>Welcome, {user?.displayName?.split(" ")[0]}!</Text>
          <View style={styles.streamBadge}>
            <Text style={styles.streamBadgeText}>
              <Icon color={COLORS.onPrimary} name={isNatural ? "flask-outline" : "library-outline"} size={12} />{" "}
              {isNatural ? "Natural Science" : "Social Science"}
            </Text>
          </View>
        </View>
        <Text style={styles.heroSubtitle}>
          Ethiopian University Entrance Examination (EUEE) Preparation
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{filteredSubjects.length}</Text>
            <Text style={styles.statLabel}>Stream Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity onPress={() => onNavigateTab("exams")} style={styles.statBox}>
            <Text style={styles.statNumber}>Mock</Text>
            <Text style={styles.statLabel}>Exams</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity onPress={() => onNavigateTab("progress")} style={styles.statBox}>
            <Text style={styles.statNumber}>Track</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Locked stream indicator banner */}
      <View style={styles.streamInfoBanner}>
        <Text style={styles.streamInfoTitle}>
          <Icon color={COLORS.primary} name={isNatural ? "flask-outline" : "library-outline"} size={15} />{"  "}
          {isNatural ? "Natural Science Stream" : "Social Science Stream"}
        </Text>
        <Text style={styles.streamInfoDesc}>
          {isNatural
            ? "Displaying only your 6 Natural Science subjects: Math (Nat), Physics, Chemistry, Biology, English & Aptitude."
            : "Displaying only your 6 Social Science subjects: Math (Soc), Economics, Geography, History, English & Aptitude."}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>
        {isNatural ? "Natural Science Subjects" : "Social Science Subjects"}
      </Text>

      {filteredSubjects.length === 0 ? (
        <EmptyState icon="library-outline" message="No subjects found for this category." title="No subjects yet" />
      ) : (
        filteredSubjects.map((subject) => (
          <TouchableOpacity
            activeOpacity={0.7}
            key={subject._id || subject.code}
            onPress={() => onSelectSubject && onSelectSubject(subject)}
          >
            <Card style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>{subject.code || "SUBJ"}</Text>
                </View>
                <Text style={styles.gradeBadge}>
                  {subject.gradeLevel ? subject.gradeLevel.replace("-", " ") : "Grade 11-12"}
                </Text>
              </View>
              <Text style={styles.subjectTitle}>{subject.name}</Text>
              <Text numberOfLines={2} style={styles.subjectDesc}>
                {subject.description || "Comprehensive syllabus notes and national exam question bank."}
              </Text>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.onPrimary
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.surfaceMuted,
    marginTop: 4,
    marginBottom: SPACING.lg
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    justifyContent: "space-around",
    alignItems: "center"
  },
  statBox: {
    alignItems: "center",
    flex: 1
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.onPrimary
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.surfaceMuted,
    marginTop: 2
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  },
  streamInfoBanner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md
  },
  streamInfoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 2
  },
  streamInfoDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs
  },
  subjectCard: {
    marginBottom: SPACING.sm
  },
  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs
  },
  codeTag: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary
  },
  gradeBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "capitalize"
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4
  },
  subjectDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: SPACING.md
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  streamBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full
  },
  streamBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: "800"
  },
  streamHeaderLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: SPACING.xs
  }
});
