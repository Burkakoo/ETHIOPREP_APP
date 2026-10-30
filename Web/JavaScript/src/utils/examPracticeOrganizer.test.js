import test from "node:test";
import assert from "node:assert/strict";
import {
  extractExamYear,
  classifyExamCategory,
  buildSubjectYearPracticeGroups,
  buildAllExamsYearGroups
} from "./examPracticeOrganizer.js";

const SAMPLE_EXAMS = [
  {
    _id: "ex_2018_math",
    title: "Mathematics Regional Model Exam (2018 E.C.)",
    examYear: 2018,
    durationMinutes: 180,
    questionIds: new Array(70).fill("q")
  },
  {
    _id: "ex_2017_math",
    title: "Mathematics ESSLCE Entrance Exam (2017 E.C.)",
    examYear: 2017,
    durationMinutes: 180,
    questionIds: new Array(60).fill("q")
  },
  {
    _id: "ex_2016_math",
    title: "Mathematics ESSLCE Entrance Exam (2016 E.C.)",
    examYear: 2016,
    durationMinutes: 180,
    questionIds: new Array(60).fill("q")
  }
];

test("extractExamYear extracts numeric E.C. year from exam object or title", () => {
  assert.equal(extractExamYear({ examYear: 2018 }), 2018);
  assert.equal(extractExamYear({ title: "Biology Entrance 2015 E.C." }), 2015);
});

test("classifyExamCategory classifies Entrances, Models, and Past Papers accurately", () => {
  assert.equal(classifyExamCategory(SAMPLE_EXAMS[0]).category, "model");
  assert.equal(classifyExamCategory(SAMPLE_EXAMS[1]).category, "entrance");
  assert.equal(classifyExamCategory("Biology Official Past Paper (2015 E.C.)", 2015).category, "past_paper");
});

test("buildSubjectYearPracticeGroups organizes years descending with Entrances, Models, and Past Papers by exam title", () => {
  const groups = buildSubjectYearPracticeGroups(SAMPLE_EXAMS);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].heading, "2018 E.C. Exams");
  assert.equal(groups[0].items[0].title, "Mathematics Regional Model Exam (2018 E.C.)");
  assert.equal(groups[0].items[0].subtitle, "180 Mins • 70 Qs • Regional Model Exam");

  assert.equal(groups[1].heading, "2017 E.C. Exams");
  assert.deepEqual(
    groups[1].items.map((i) => i.title),
    [
      "Mathematics ESSLCE Entrance Exam (2017 E.C.)",
      "Mathematics Regional Model Exam (2017 E.C.)",
      "Mathematics Official Past Paper (2017 E.C.)"
    ]
  );
  assert.equal(groups[1].items[0].subtitle, "180 Mins • 60 Qs • Entrance Exam");
  assert.equal(groups[1].items[1].subtitle, "150 Mins • 51 Qs • Regional Model");
  assert.equal(groups[1].items[2].subtitle, "120 Mins • 39 Qs • Past Paper");
});

test("buildSubjectYearPracticeGroups filters items in real-time by search query and categoryFilter", () => {
  const modelOnly = buildSubjectYearPracticeGroups(SAMPLE_EXAMS, "", "model");
  assert.equal(modelOnly.length, 3);
  assert.ok(modelOnly.every((g) => g.items.length === 1 && g.items[0].category === "model"));

  const entranceOnly = buildSubjectYearPracticeGroups(SAMPLE_EXAMS, "", "entrance");
  assert.equal(entranceOnly.length, 2);
  assert.ok(entranceOnly.every((g) => g.items.length === 1 && g.items[0].category === "entrance"));

  const year2017Only = buildSubjectYearPracticeGroups(SAMPLE_EXAMS, "2017");
  assert.equal(year2017Only.length, 1);
  assert.equal(year2017Only[0].year, 2017);
});

test("buildAllExamsYearGroups groups and filters exams by year, exam title, and category", () => {
  const groups = buildAllExamsYearGroups(SAMPLE_EXAMS, "Regional Model");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].year, 2018);
  assert.equal(groups[0].heading, "2018 E.C. Exams");
  assert.equal(groups[0].exams[0].formattedSubtitle, "180 Mins • 70 Qs • Regional Model Exam");

  const entranceGroups = buildAllExamsYearGroups(SAMPLE_EXAMS, "", "entrance");
  assert.equal(entranceGroups.length, 2);
  assert.equal(entranceGroups[0].year, 2017);
});
