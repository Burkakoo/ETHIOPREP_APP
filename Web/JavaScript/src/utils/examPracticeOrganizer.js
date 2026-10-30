export function extractExamYear(exam) {
  if (!exam) return 2017;
  if (exam.examYear || exam.year) return Number(exam.examYear || exam.year) || 2017;
  const match = String(exam.title || "").match(/\b(201[3-9]|202\d)\b/);
  return match ? Number(match[1]) : 2017;
}

export function classifyExamCategory(examOrTitle = "", fallbackYear = 2017) {
  const rawTitle =
    typeof examOrTitle === "string"
      ? examOrTitle
      : String(examOrTitle?.title || examOrTitle?.examType || "");
  const lower = rawTitle.toLowerCase();
  const yr =
    typeof examOrTitle === "object" && examOrTitle !== null
      ? extractExamYear(examOrTitle)
      : Number(fallbackYear) || 2017;

  if (lower.includes("model") || yr === 2018) {
    return {
      category: "model",
      typeLabel: "Regional Model Exam",
      shortBadge: "Model"
    };
  }
  if (lower.includes("past paper") || lower.includes("booklet")) {
    return {
      category: "past_paper",
      typeLabel: "Official Past Paper",
      shortBadge: "Past Paper"
    };
  }
  return {
    category: "entrance",
    typeLabel: "Entrance Exam (ESSLCE)",
    shortBadge: "Entrance"
  };
}

function extractSubjectLabel(exam) {
  const subjObj = typeof exam?.subjectId === "object" && exam?.subjectId ? exam.subjectId : exam?.subject;
  if (subjObj?.name) {
    return String(subjObj.name).replace(/^Grade\s+\d+\s+/i, "").trim();
  }
  const raw = String(exam?.title || "")
    .replace(/\(\d{4}\s*E\.?C\.?\)/gi, "")
    .replace(/\b201[3-9]\s*E\.?C\.?/gi, "")
    .replace(/\b(Regional\s+Model\s+Exam|ESSLCE\s+Entrance\s+Exam|National\s+Entrance\s+Exam|Entrance\s+Exam|ESSLCE|EUEE)\b/gi, "")
    .replace(/[-—–:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw || "Subject";
}

export function buildSubjectYearPracticeGroups(
  subjectExams = [],
  searchQuery = "",
  categoryFilter = "all"
) {
  const byYear = new Map();

  for (const ex of subjectExams) {
    const yr = extractExamYear(ex);
    if (!byYear.has(yr)) {
      byYear.set(yr, []);
    }
    byYear.get(yr).push(ex);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  const q = String(searchQuery || "").trim().toLowerCase();
  const catFilter = String(categoryFilter || "all").toLowerCase();

  const groups = [];

  for (const year of years) {
    const examsInYear = (byYear.get(year) || [])
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    const primaryExam = examsInYear[0];
    if (!primaryExam) continue;

    const totalQs = primaryExam.questionIds?.length || primaryExam.totalQuestions || 65;
    const dur = primaryExam.durationMinutes || 180;
    const chapters = Array.isArray(primaryExam.chapterBreakdown) ? primaryExam.chapterBreakdown : [];
    const subjectLabel = extractSubjectLabel(primaryExam);
    const primaryTitle = String(primaryExam.title || `${subjectLabel} Exam (${year} E.C.)`).trim();

    // Organize by Year and Exam Title across Past Papers, Entrances, and Models
    const rawItems =
      year === 2018
        ? [
            {
              id: `${primaryExam._id}_model`,
              examId: primaryExam._id,
              year,
              category: "model",
              type: "Regional Model Exam",
              title: primaryTitle.includes("Model")
                ? primaryTitle
                : `${subjectLabel} Regional Model Exam (${year} E.C.)`,
              fullTitle: primaryTitle,
              durationMinutes: dur,
              scopeLabel: "Regional Model Exam",
              subtitle: `${dur} Mins • ${totalQs} Qs • Regional Model Exam`,
              questionCount: totalQs,
              chapterId: null,
              exam: primaryExam
            }
          ]
        : [
            {
              id: `${primaryExam._id}_entrance`,
              examId: primaryExam._id,
              year,
              category: "entrance",
              type: "Entrance Exam",
              title:
                primaryTitle.toLowerCase().includes("entrance") ||
                primaryTitle.toLowerCase().includes("esslce") ||
                primaryTitle.toLowerCase().includes("euee")
                  ? primaryTitle
                  : `${subjectLabel} ESSLCE Entrance Exam (${year} E.C.)`,
              fullTitle: primaryTitle,
              durationMinutes: dur,
              scopeLabel: "Entrance Exam (ESSLCE)",
              subtitle: `${dur} Mins • ${totalQs} Qs • Entrance Exam`,
              questionCount: totalQs,
              chapterId: null,
              exam: primaryExam
            },
            {
              id: `${primaryExam._id}_model`,
              examId: primaryExam._id,
              year,
              category: "model",
              type: "Regional Model Exam",
              title: `${subjectLabel} Regional Model Exam (${year} E.C.)`,
              fullTitle: `${subjectLabel} Regional Model Exam (${year} E.C.)`,
              durationMinutes: 150,
              scopeLabel: "Regional Model Exam",
              subtitle: `150 Mins • ${Math.max(40, Math.round(totalQs * 0.85))} Qs • Regional Model`,
              questionCount: Math.max(40, Math.round(totalQs * 0.85)),
              chapterId: null,
              exam: primaryExam
            },
            {
              id: `${primaryExam._id}_past_paper`,
              examId: primaryExam._id,
              year,
              category: "past_paper",
              type: "Official Past Paper",
              title: `${subjectLabel} Official Past Paper (${year} E.C.)`,
              fullTitle: `${subjectLabel} Official Past Paper (${year} E.C.)`,
              durationMinutes: 120,
              scopeLabel: "Official Past Paper",
              subtitle: `120 Mins • ${Math.max(30, Math.round(totalQs * 0.65))} Qs • Past Paper`,
              questionCount: Math.max(30, Math.round(totalQs * 0.65)),
              chapterId: chapters[0]?.chapterId || null,
              exam: primaryExam
            }
          ];

    const filteredItems = rawItems.filter((item) => {
      if (catFilter !== "all" && item.category !== catFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.fullTitle.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        String(year).includes(q)
      );
    });

    if (filteredItems.length > 0) {
      groups.push({
        year,
        heading: `${year} E.C. Exams`,
        primaryExam,
        items: filteredItems,
        chapters
      });
    }
  }

  return groups;
}

export function buildAllExamsYearGroups(
  allExams = [],
  searchQuery = "",
  categoryFilter = "all"
) {
  const q = String(searchQuery || "").trim().toLowerCase();
  const catFilter = String(categoryFilter || "all").toLowerCase();

  const filtered = allExams.filter((ex) => {
    const info = classifyExamCategory(ex);
    if (catFilter !== "all" && info.category !== catFilter) {
      return false;
    }
    if (!q) return true;
    const title = String(ex.title || "").toLowerCase();
    const subjName = String(
      typeof ex.subjectId === "object" ? ex.subjectId?.name || "" : ""
    ).toLowerCase();
    const yr = String(extractExamYear(ex));
    const typeLabel = info.typeLabel.toLowerCase();
    return (
      title.includes(q) ||
      subjName.includes(q) ||
      yr.includes(q) ||
      typeLabel.includes(q)
    );
  });

  const byYear = new Map();
  for (const ex of filtered) {
    const yr = extractExamYear(ex);
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr).push(ex);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  return years.map((year) => {
    const exams = (byYear.get(year) || [])
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")))
      .map((ex) => {
        const info = classifyExamCategory(ex, year);
        const dur = ex.durationMinutes || 180;
        const qCount = ex.questionIds?.length || ex.totalQuestions || 60;
        return {
          ...ex,
          category: info.category,
          typeLabel: info.typeLabel,
          shortBadge: info.shortBadge,
          formattedSubtitle: `${dur} Mins • ${qCount} Qs • ${info.typeLabel}`
        };
      });
    return {
      year,
      heading: `${year} E.C. Exams`,
      exams
    };
  });
}
