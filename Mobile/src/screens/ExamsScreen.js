import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { EmptyState } from "../components/EmptyState.js";
import { COLORS, RADIUS, SHADOW, SPACING } from "../utils/theme.js";

function getYear(exam) {
  if (exam.examYear || exam.year) return String(exam.examYear || exam.year);
  return (exam.title || "").match(/\b(?:19|20)\d{2}\b/)?.[0] || "Practice";
}

function getExamChapters(exam) {
  if (!Array.isArray(exam?.chapterIds)) return [];
  return exam.chapterIds.map((ch) => {
    if (typeof ch === "object" && ch !== null) {
      return {
        id: String(ch._id || ch.id || Math.random()),
        title: ch.title || "Curriculum Unit",
        order: ch.order ?? 999
      };
    }
    return { id: String(ch), title: "Curriculum Unit", order: 999 };
  });
}

export function ExamsScreen({ exams = [], onStartExam, loadingExamId, user }) {
  const userStream = user?.stream || "natural";
  const isNatural = userStream === "natural";

  // Display mode: "year" | "chapter" | "all"
  const [viewMode, setViewMode] = useState("year");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedChapterId, setSelectedChapterId] = useState("all");

  const streamFilteredExams = useMemo(() => {
    return exams.filter((exam) => {
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
  }, [exams, isNatural]);

  // Group by Year
  const yearGroups = useMemo(() => {
    const map = {};
    streamFilteredExams.forEach((exam) => {
      const y = getYear(exam);
      if (!map[y]) map[y] = [];
      map[y].push(exam);
    });

    const sortedYears = Object.keys(map).sort((a, b) => {
      if (a === "Practice") return 1;
      if (b === "Practice") return -1;
      return b.localeCompare(a, undefined, { numeric: true });
    });

    return sortedYears.map((year) => ({
      year,
      exams: map[year]
    }));
  }, [streamFilteredExams]);

  const allYears = useMemo(() => {
    return yearGroups.map((g) => g.year);
  }, [yearGroups]);

  // Group by Chapter
  const chapterGroups = useMemo(() => {
    const map = {};
    const unassignedExams = [];

    streamFilteredExams.forEach((exam) => {
      const chapters = getExamChapters(exam);
      if (chapters.length === 0) {
        unassignedExams.push(exam);
      } else {
        chapters.forEach((ch) => {
          const key = ch.id;
          if (!map[key]) {
            map[key] = {
              id: ch.id,
              title: ch.title,
              order: ch.order,
              subjectName: exam.subjectId?.name || "Subject",
              exams: []
            };
          }
          if (!map[key].exams.some((e) => e._id === exam._id)) {
            map[key].exams.push(exam);
          }
        });
      }
    });

    const sortedChapters = Object.values(map).sort((a, b) => a.order - b.order);

    return {
      chapters: sortedChapters,
      unassignedExams
    };
  }, [streamFilteredExams]);

  function renderExamCard(item, showYearBadge = false) {
    const isPremium = item.accessLevel === "premium";
    const year = getYear(item);
    const chapters = getExamChapters(item);

    return (
      <Card key={item._id} style={styles.examCard}>
        <View style={styles.badgeRow}>
          <View style={styles.badgeLeft}>
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

            {item.subjectId?.name ? (
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{item.subjectId.name}</Text>
              </View>
            ) : null}

            {showYearBadge && (
              <View style={styles.yearBadge}>
                <Text style={styles.yearBadgeText}>{year}</Text>
              </View>
            )}
          </View>

          <Text style={styles.durationText}>{item.durationMinutes} min</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {item.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {item.description}
          </Text>
        ) : null}

        {/* Chapter pill indicator if exam has chapters */}
        {chapters.length > 0 && (
          <View style={styles.chapterTagRow}>
            <Icon color={COLORS.primaryDark} name="layers-outline" size={13} />
            <Text numberOfLines={1} style={styles.chapterTagText}>
              {chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"} covered:{" "}
              {chapters.map((c) => c.title.split(":")[0]).join(", ")}
            </Text>
          </View>
        )}

        {/* Practise individual chapters in this exam */}
        {Array.isArray(item.chapterBreakdown) && item.chapterBreakdown.length > 0 && (
          <View style={styles.cardChaptersContainer}>
            <Text style={styles.cardChaptersTitle}>
              Practise One Chapter in {year} at Once:
            </Text>
            <ScrollView
              contentContainerStyle={styles.cardChaptersScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {item.chapterBreakdown.map((ch) => {
                const isChLoading = loadingExamId === `${item._id}_${ch.chapterId}`;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isChLoading}
                    key={ch.chapterId}
                    onPress={() => onStartExam(item, { chapterId: ch.chapterId })}
                    style={styles.cardChapterBtn}
                  >
                    <Icon color={COLORS.primaryDark} name="play" size={11} />
                    <Text numberOfLines={1} style={styles.cardChapterBtnText}>
                      {ch.title.split(":")[0]} ({ch.questionCount} Qs)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
          Practise Full {year} Exam ({item.questionIds?.length || 0} Qs)
        </Button>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <Text style={styles.header}>
        <Icon color={COLORS.primary} name={isNatural ? "flask-outline" : "library-outline"} size={20} />{"  "}
        {isNatural ? "Natural Science Exams" : "Social Science Exams"}
      </Text>
      <Text style={styles.subHeader}>
        Timed simulations based on Ethiopian EUEE blueprints for {isNatural ? "Natural" : "Social"} Science.
      </Text>

      {/* Buttons used to display exam by Year and Chapters */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("year")}
          style={[styles.toggleBtn, viewMode === "year" && styles.toggleBtnActive]}
        >
          <Icon
            color={viewMode === "year" ? COLORS.onPrimary : COLORS.primary}
            name="calendar"
            size={16}
          />
          <Text
            style={[styles.toggleBtnText, viewMode === "year" && styles.toggleBtnTextActive]}
          >
            By Year
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("chapter")}
          style={[styles.toggleBtn, viewMode === "chapter" && styles.toggleBtnActive]}
        >
          <Icon
            color={viewMode === "chapter" ? COLORS.onPrimary : COLORS.primary}
            name="layers-outline"
            size={16}
          />
          <Text
            style={[styles.toggleBtnText, viewMode === "chapter" && styles.toggleBtnTextActive]}
          >
            By Chapters
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setViewMode("all")}
          style={[styles.toggleBtn, viewMode === "all" && styles.toggleBtnActive]}
        >
          <Icon
            color={viewMode === "all" ? COLORS.onPrimary : COLORS.primary}
            name="grid-outline"
            size={16}
          />
          <Text
            style={[styles.toggleBtnText, viewMode === "all" && styles.toggleBtnTextActive]}
          >
            All Exams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {streamFilteredExams.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          message="No published exams currently available for your stream."
          title="No exams yet"
        />
      ) : (
        <>
          {/* ───────────────── BY YEAR MODE ───────────────── */}
          {viewMode === "year" && (
            <View>
              {/* Year Filter Chips */}
              {allYears.length > 1 && (
                <ScrollView
                  contentContainerStyle={styles.filterScroll}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedYear("all")}
                    style={[
                      styles.filterChip,
                      selectedYear === "all" && styles.filterChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedYear === "all" && styles.filterChipTextActive
                      ]}
                    >
                      All Years ({streamFilteredExams.length})
                    </Text>
                  </TouchableOpacity>

                  {allYears.map((yr) => {
                    const count = yearGroups.find((g) => g.year === yr)?.exams.length || 0;
                    const isActive = selectedYear === yr;
                    return (
                      <TouchableOpacity
                        key={yr}
                        onPress={() => setSelectedYear(yr)}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isActive && styles.filterChipTextActive
                          ]}
                        >
                          {yr} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Year Groups */}
              {yearGroups
                .filter((g) => selectedYear === "all" || g.year === selectedYear)
                .map((group) => (
                  <View key={group.year} style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <View style={styles.sectionTitleLeft}>
                        <Icon color={COLORS.primary} name="calendar-outline" size={17} />
                        <Text style={styles.sectionHeading}>
                          {group.year === "Practice"
                            ? "General Practice Exams"
                            : `${group.year} National Entrance Exams`}
                        </Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{group.exams.length}</Text>
                      </View>
                    </View>

                    {group.exams.map((item) => renderExamCard(item, false))}
                  </View>
                ))}
            </View>
          )}

          {/* ───────────────── BY CHAPTER MODE ───────────────── */}
          {viewMode === "chapter" && (
            <View>
              <Text style={styles.modeNoticeText}>
                Exams categorized by subject curriculum chapters and units.
              </Text>

              {/* Chapters List */}
              {chapterGroups.chapters.length === 0 ? (
                <Card style={styles.infoCard}>
                  <Icon color={COLORS.primary} name="information-circle-outline" size={24} />
                  <Text style={styles.infoCardTitle}>Curriculum Units</Text>
                  <Text style={styles.infoCardSub}>
                    Exams currently available cover comprehensive subject papers. Explore them below or under "By Year".
                  </Text>
                </Card>
              ) : (
                chapterGroups.chapters.map((ch) => (
                  <View key={ch.id} style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <View style={styles.sectionTitleLeft}>
                        <Icon color={COLORS.primary} name="book-outline" size={16} />
                        <Text numberOfLines={1} style={styles.sectionHeading}>
                          {ch.title}
                        </Text>
                      </View>
                      <View style={styles.chapterSubjectPill}>
                        <Text style={styles.chapterSubjectPillText}>{ch.subjectName}</Text>
                      </View>
                    </View>

                    {ch.exams.map((item) => {
                      const yr = getYear(item);
                      const bItem = Array.isArray(item.chapterBreakdown)
                        ? item.chapterBreakdown.find((b) => String(b.chapterId) === String(ch.id))
                        : null;
                      const qCount = bItem?.questionCount;
                      const isChLoading = loadingExamId === `${item._id}_${ch.id}`;

                      return (
                        <Card key={`${item._id}_${ch.id}`} style={styles.examCard}>
                          <View style={styles.badgeRow}>
                            <View style={styles.badgeLeft}>
                              <View style={styles.yearBadge}>
                                <Text style={styles.yearBadgeText}>{yr} Exam Booklet</Text>
                              </View>
                              <View style={styles.subjectBadge}>
                                <Text style={styles.subjectBadgeText}>{item.subjectId?.name || "Subject"}</Text>
                              </View>
                            </View>
                            <Text style={styles.durationText}>{item.durationMinutes} min</Text>
                          </View>

                          <Text style={styles.title}>{item.title}</Text>

                          <View style={styles.chapterDirectActionRow}>
                            <View style={styles.chapterDirectInfo}>
                              <Text style={styles.chapterDirectCountText}>
                                {qCount !== undefined && qCount !== null
                                  ? `${qCount} questions from this unit in ${yr}`
                                  : "Chapter practice questions"}
                              </Text>
                            </View>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={isChLoading}
                              onPress={() => onStartExam(item, { chapterId: ch.id })}
                              style={styles.chapterDirectBtn}
                            >
                              <Icon color={COLORS.onPrimary} name="play" size={13} />
                              <Text style={styles.chapterDirectBtnText}>
                                {isChLoading ? "Opening..." : `Practise ${yr} Unit (${qCount || ""} Qs)`}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                ))
              )}

              {/* Unassigned / Comprehensive Papers */}
              {chapterGroups.unassignedExams.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionTitleLeft}>
                      <Icon color={COLORS.primary} name="documents-outline" size={16} />
                      <Text style={styles.sectionHeading}>Full Subject Blueprint Exams</Text>
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {chapterGroups.unassignedExams.length}
                      </Text>
                    </View>
                  </View>

                  {chapterGroups.unassignedExams.map((item) => renderExamCard(item, true))}
                </View>
              )}
            </View>
          )}

          {/* ───────────────── ALL EXAMS MODE ───────────────── */}
          {viewMode === "all" && (
            <View>
              {streamFilteredExams.map((item) => renderExamCard(item, true))}
            </View>
          )}
        </>
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
  toggleRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
    gap: 4,
    ...SHADOW.sm
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  toggleBtnTextActive: {
    color: COLORS.onPrimary
  },
  filterScroll: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  filterChipTextActive: {
    color: COLORS.primaryDark
  },
  sectionBlock: {
    marginBottom: SPACING.lg
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm
  },
  sectionTitleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginRight: 8
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    flexShrink: 1
  },
  countBadge: {
    backgroundColor: COLORS.surfaceAlt || "#E5E7EB",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primaryDark
  },
  chapterSubjectPill: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  chapterSubjectPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark
  },
  modeNoticeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.md
  },
  infoCard: {
    alignItems: "center",
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 6
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4
  },
  infoCardSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18
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
  badgeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1
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
  subjectBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark
  },
  yearBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm
  },
  yearBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text
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
  chapterTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: SPACING.sm
  },
  chapterTagText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: "700",
    flex: 1
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
  cardChaptersContainer: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.borderLight || "#E5E7EB",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm
  },
  cardChaptersTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  cardChaptersScroll: {
    gap: 6
  },
  cardChapterBtn: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primaryLight || "#93C5FD",
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  cardChapterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark
  },
  chapterDirectActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  chapterDirectInfo: {
    flex: 1,
    marginRight: 8
  },
  chapterDirectCountText: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  chapterDirectBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  chapterDirectBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.onPrimary
  }
});
