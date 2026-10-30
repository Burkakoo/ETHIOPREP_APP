import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  AwardIcon,
  BookMarkedIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  CreditCardIcon,
  FlameIcon,
  GraduationCapIcon,
  HeartIcon,
  HomeIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
  WifiIcon,
  WifiOffIcon,
  XCircleIcon
} from "lucide-react";
import {
  buildSubjectYearPracticeGroups,
  buildAllExamsYearGroups
} from "../utils/examPracticeOrganizer.js";
import {
  synthesizeOfflineExamStart,
  gradeOfflineExamAttempt
} from "../utils/offlineExamEngine.js";
import {
  OFFLINE_BUNDLE_STORAGE_KEY,
  useServiceWorkerCache,
  PWAInstallButton,
  OfflineStatusPill,
  OfflineBanner
} from "./PWAStatusBanner.jsx";

const SIM_TOKEN_KEY = "ethioprep_mobile_sim_token";
const SIM_REFRESH_KEY = "ethioprep_mobile_sim_refresh";
const SIM_USER_KEY = "ethioprep_mobile_sim_user";
const LOCAL_API_CACHE_PREFIX = "ethioprep_api_cache_v1:";

function readLocalOfflineBundle() {
  try {
    const raw = localStorage.getItem(OFFLINE_BUNDLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalApiBackup(path, data) {
  try {
    localStorage.setItem(`${LOCAL_API_CACHE_PREFIX}${path}`, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function readLocalApiBackup(path) {
  try {
    const raw = localStorage.getItem(`${LOCAL_API_CACHE_PREFIX}${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function resolveOfflineFallbackForPath(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const bundle = readLocalOfflineBundle();

  if (method === "POST" && /^\/exams\/[^/]+\/start/.test(path)) {
    const [pathname, search = ""] = path.split("?");
    const examId = pathname.split("/")[2];
    const sp = new URLSearchParams(search);
    let bodyObj = {};
    try {
      bodyObj = options.body ? JSON.parse(options.body) : {};
    } catch {
      bodyObj = {};
    }
    const chapterId = sp.get("chapterId") || bodyObj.chapterId || "";
    const allYears = sp.get("allYears") === "true" || bodyObj.allYears === true;
    const sessionKey = `/exams/${examId}/start?chapterId=${chapterId}&allYears=${allYears}`;
    const savedSession = readLocalApiBackup(sessionKey);
    if (savedSession) return savedSession;
    if (bundle) {
      const synthesized = synthesizeOfflineExamStart(bundle, examId, { chapterId, allYears });
      if (synthesized) return synthesized;
    }
  }

  if (method === "POST" && /^\/exams\/attempts\/[^/]+\/submit/.test(path)) {
    let bodyObj = {};
    try {
      bodyObj = options.body ? JSON.parse(options.body) : {};
    } catch {
      bodyObj = {};
    }
    const questions = bundle?.questions || [];
    const graded = gradeOfflineExamAttempt(questions, bodyObj.answers || [], 50);
    return { attempt: graded };
  }

  if (method === "GET") {
    const direct = readLocalApiBackup(path);
    if (direct) return direct;
    if (bundle) {
      if (path === "/question-bank/subjects") return { subjects: bundle.subjects || [] };
      if (path === "/exams") return { exams: bundle.exams || [] };
      if (/^\/question-bank\/subjects\/[^/]+\/chapters$/.test(path)) {
        const subjectId = path.split("/")[3];
        const chapters = (bundle.chapters || []).filter((c) => String(c.subjectId) === String(subjectId));
        return { chapters };
      }
    }
  }

  return null;
}

let simRefreshPromise = null;

async function refreshOrRecoverSimSession() {
  if (simRefreshPromise) {
    return simRefreshPromise;
  }

  simRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(SIM_REFRESH_KEY);
      if (refreshToken) {
        const rRes = await fetch("/api/auth/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
        if (rRes.ok) {
          const rData = await rRes.json().catch(() => ({}));
          if (rData.accessToken) {
            localStorage.setItem(SIM_TOKEN_KEY, rData.accessToken);
            if (rData.refreshToken) {
              localStorage.setItem(SIM_REFRESH_KEY, rData.refreshToken);
            }
            return rData.accessToken;
          }
        } else {
          localStorage.removeItem(SIM_TOKEN_KEY);
          localStorage.removeItem(SIM_REFRESH_KEY);
        }
      }

      // Fallback: seamlessly re-authenticate the demo student session if token was cleared/expired
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "student@ethioprep.com",
          password: "studentPassword123"
        })
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginData.accessToken) {
          localStorage.setItem(SIM_TOKEN_KEY, loginData.accessToken);
          if (loginData.refreshToken) {
            localStorage.setItem(SIM_REFRESH_KEY, loginData.refreshToken);
          }
          if (loginData.user) {
            localStorage.setItem(SIM_USER_KEY, JSON.stringify(loginData.user));
          }
          return loginData.accessToken;
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      simRefreshPromise = null;
    }
  })();

  return simRefreshPromise;
}

async function mobileApi(path, options = {}, isRetry = false) {
  const token = localStorage.getItem(SIM_TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`/api${path}`, { ...options, headers });
    if (
      res.status === 401 &&
      !isRetry &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/refresh-token")
    ) {
      const recoveredToken = await refreshOrRecoverSimSession();
      if (recoveredToken) {
        return mobileApi(path, options, true);
      }
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fallback = resolveOfflineFallbackForPath(path, options);
      if (fallback) return fallback;
      throw new Error(body.error || "Request failed");
    }

    const method = String(options.method || "GET").toUpperCase();
    if (method === "GET") {
      saveLocalApiBackup(path, body);
    } else if (method === "POST" && /^\/exams\/[^/]+\/start/.test(path)) {
      const [pathname, search = ""] = path.split("?");
      const examId = pathname.split("/")[2];
      const sp = new URLSearchParams(search);
      const chapterId = sp.get("chapterId") || "";
      const allYears = sp.get("allYears") === "true";
      saveLocalApiBackup(`/exams/${examId}/start?chapterId=${chapterId}&allYears=${allYears}`, body);
    }
    return body;
  } catch (err) {
    const fallback = resolveOfflineFallbackForPath(path, options);
    if (fallback) return fallback;
    throw err;
  }
}

const GRADES = [
  { id: "grade-9", label: "Grade 9" },
  { id: "grade-10", label: "Grade 10" },
  { id: "grade-11", label: "Grade 11" },
  { id: "grade-12", label: "Grade 12" }
];

function formatGradeLabel(gradeLevel) {
  const g = GRADES.find((x) => x.id === gradeLevel);
  return g ? g.label : "Grade 12";
}

function getBaseSubjectCode(code) {
  return String(code || "").toUpperCase().replace(/_(9|10|11|12|COL)$/i, "");
}

function formatMathText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1/$2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\times\b/g, "×")
    .replace(/\\div\b/g, "÷")
    .replace(/\\leq\b/g, "≤")
    .replace(/\\geq\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\rightarrow\b/g, "→")
    .replace(/\$/g, "");
}

// Reusable Question-Booklet SVG icon matching the screenshot's circular blue badge
function QuestionBookletIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5V18.5C5 19.3284 5.67157 20 6.5 20H17.5"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="7.5" y="3.5" width="12" height="14" rx="2.2" fill="#2563EB" />
      <text
        x="13.5"
        y="13.2"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}

// Reusable Open Book Hero SVG icon matching the screenshot's header illustration
function OpenBookHeroIllustration() {
  return (
    <svg width="62" height="48" viewBox="0 0 64 50" fill="none" aria-hidden="true">
      {/* Left page */}
      <path
        d="M6 10C6 7.79086 7.79086 6 10 6H27C29.7614 6 32 8.23858 32 11V43C32 41.3431 30.2091 40 28 40H10C7.79086 40 6 38.2091 6 36V10Z"
        fill="rgba(255, 255, 255, 0.42)"
      />
      {/* Right page */}
      <path
        d="M58 10C58 7.79086 56.2091 6 54 6H37C34.2386 6 32 8.23858 32 11V43C32 41.3431 33.7909 40 36 40H54C56.2091 40 58 38.2091 58 36V10Z"
        fill="rgba(255, 255, 255, 0.54)"
      />
      {/* Lines on right page */}
      <rect x="37" y="13" width="15" height="3.2" rx="1.6" fill="#4F46E5" fillOpacity="0.65" />
      <rect x="37" y="20" width="15" height="3.2" rx="1.6" fill="#4F46E5" fillOpacity="0.65" />
      <rect x="37" y="27" width="11" height="3.2" rx="1.6" fill="#4F46E5" fillOpacity="0.65" />
    </svg>
  );
}

export function MobileAppSimulator({ onBackToPortal }) {
  const [simUser, setSimUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIM_USER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState("student@ethioprep.com");
  const [password, setPassword] = useState("studentPassword123");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Navigation state matching Mobile/App.js
  const [tab, setTab] = useState("home"); // home | exams | progress | payment | profile
  const [selectedGrade, setSelectedGrade] = useState("grade-12");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [hasAutoOpenedSubject, setHasAutoOpenedSubject] = useState(false);
  const [subjectTab, setSubjectTab] = useState("practice"); // practice | insights | lectures | docs
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState("all"); // all | entrance | model | past_paper
  const [collapsedYears, setCollapsedYears] = useState({});
  const [favoriteExamIds, setFavoriteExamIds] = useState({
    fav_default_1: false
  });
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedYearGradeFilter, setSelectedYearGradeFilter] = useState("all");
  const [readingNote, setReadingNote] = useState(null);

  // Active Exam Runner state matching Mobile/src/screens/ExamActiveScreen.js
  const [activeExamCtx, setActiveExamCtx] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [bookmarkedIds, setBookmarkedIds] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [reviewWrongOnly, setReviewWrongOnly] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [activeOrganizeMode, setActiveOrganizeMode] = useState("year_topic"); // "year_topic" | "sequential"
  const [activeYearFilter, setActiveYearFilter] = useState("all");
  const [activeTopicFilter, setActiveTopicFilter] = useState("all");

  // Exams Tab state matching Mobile/src/screens/ExamsScreen.js
  const [examsTabViewMode, setExamsTabViewMode] = useState("year"); // "year" | "title" | "all"
  const [examsTabYearFilter, setExamsTabYearFilter] = useState("all");
  const [examsTabSubjectFilter, setExamsTabSubjectFilter] = useState("all");
  const [examsTabSearchQuery, setExamsTabSearchQuery] = useState("");
  const [examsTabCategoryFilter, setExamsTabCategoryFilter] = useState("all"); // all | entrance | model

  // Data state
  const [subjects, setSubjects] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [subjectChapters, setSubjectChapters] = useState([]);
  const [subjectNotes, setSubjectNotes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Payment form
  const [payMethod, setPayMethod] = useState("telebirr");
  const [payRef, setPayRef] = useState("");
  const [payNotice, setPayNotice] = useState("");

  function toggleYearCollapse(yrKey) {
    setCollapsedYears((prev) => ({
      ...prev,
      [yrKey]: !prev[yrKey]
    }));
  }

  function toggleFavoriteExam(itemId, e) {
    if (e) e.stopPropagation();
    setFavoriteExamIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }

  async function handleStudentLogin(e) {
    if (e) e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await mobileApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem(SIM_TOKEN_KEY, res.accessToken);
      if (res.refreshToken) localStorage.setItem(SIM_REFRESH_KEY, res.refreshToken);
      localStorage.setItem(SIM_USER_KEY, JSON.stringify(res.user));
      setSimUser(res.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleStudentLogout() {
    localStorage.removeItem(SIM_TOKEN_KEY);
    localStorage.removeItem(SIM_REFRESH_KEY);
    localStorage.removeItem(SIM_USER_KEY);
    setSimUser(null);
    setSelectedSubject(null);
    setActiveExamCtx(null);
  }

  // Auto-sign in demo student on initial mount for immediate interactive analysis & testing
  useEffect(() => {
    if (!simUser && !authLoading) {
      handleStudentLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!simUser) return;
    setDataLoading(true);
    Promise.all([
      mobileApi("/question-bank/subjects").catch(() => ({ subjects: [] })),
      mobileApi("/exams").catch(() => ({ exams: [] })),
      mobileApi("/progress/leaderboard").catch(() => ({ leaderboard: [] })),
      mobileApi("/bookmarks").catch(() => ({ bookmarks: [] })),
      mobileApi("/payments").catch(() => ({ payments: [] }))
    ])
      .then(([subRes, exRes, progRes, bmRes, payRes]) => {
        const loadedSubjects = subRes.subjects || [];
        setSubjects(loadedSubjects);
        setAllExams(exRes.exams || []);
        setLeaderboard(progRes.leaderboard || []);
        setBookmarks(bmRes.bookmarks || []);
        setPayments(payRes.payments || []);

        // Auto-open Mathematics on initial load so the organized course view is immediately visible
        if (!hasAutoOpenedSubject && loadedSubjects.length > 0) {
          const mathSubj =
            loadedSubjects.find((s) => String(s.code || "").toUpperCase().includes("MATH") && s.gradeLevel === "grade-12") ||
            loadedSubjects.find((s) => String(s.name || "").toLowerCase().includes("math")) ||
            loadedSubjects[0];
          if (mathSubj) {
            setSelectedSubject(mathSubj);
            setSubjectTab("practice");
            setHasAutoOpenedSubject(true);
          }
        }
      })
      .finally(() => setDataLoading(false));
  }, [simUser, hasAutoOpenedSubject]);

  // Load chapters & notes when a subject is selected
  useEffect(() => {
    if (!selectedSubject || !simUser) return;
    const baseCode = getBaseSubjectCode(selectedSubject.code);
    const matchingSubjects = subjects.filter((s) => getBaseSubjectCode(s.code) === baseCode);
    const targetList = matchingSubjects.length > 0 ? matchingSubjects : [selectedSubject];

    Promise.all([
      Promise.all(
        targetList.map((s) =>
          mobileApi(`/question-bank/subjects/${s._id}/chapters`)
            .then((r) => (r.chapters || []).map((ch) => ({ ...ch, gradeLevel: s.gradeLevel || "grade-12", subjectCode: s.code })))
            .catch(() => [])
        )
      ),
      mobileApi(`/notes?subjectId=${selectedSubject._id}`).catch(() => ({ notes: [] }))
    ]).then(([chLists, noteRes]) => {
      const merged = chLists.flat().sort((a, b) => {
        const gOrder = { "grade-9": 9, "grade-10": 10, "grade-11": 11, "grade-12": 12 };
        const ga = gOrder[a.gradeLevel] || 12;
        const gb = gOrder[b.gradeLevel] || 12;
        if (ga !== gb) return ga - gb;
        return (a.order || 0) - (b.order || 0);
      });
      setSubjectChapters(merged);
      setSubjectNotes(noteRes.notes || []);
    });
  }, [selectedSubject, subjects, simUser]);

  const userStream = simUser?.stream || "natural";

  const filteredHomeSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const sGrade = s.gradeLevel || "grade-12";
      if (sGrade !== selectedGrade) return false;
      if (!s.stream || s.stream === "both") return true;
      return s.stream === userStream;
    });
  }, [subjects, selectedGrade, userStream]);

  const subjectExams = useMemo(() => {
    if (!selectedSubject) return [];
    const base = getBaseSubjectCode(selectedSubject.code);
    return allExams.filter((ex) => {
      const subjObj = typeof ex.subjectId === "object" && ex.subjectId ? ex.subjectId : ex.subject;
      const exCode = getBaseSubjectCode(subjObj?.code || "");
      const exSubId = subjObj?._id || ex.subjectId;
      return exCode === base || String(exSubId) === String(selectedSubject._id);
    });
  }, [allExams, selectedSubject]);

  const examYears = useMemo(() => {
    const map = {};
    for (const ex of subjectExams) {
      const yr = ex.examYear || 2016;
      if (!map[yr]) map[yr] = [];
      map[yr].push(ex);
    }
    return Object.keys(map)
      .map((k) => Number(k))
      .sort((a, b) => b - a);
  }, [subjectExams]);

  useEffect(() => {
    if (examYears.length > 0 && (!selectedYear || !examYears.includes(selectedYear))) {
      setSelectedYear(examYears[0]);
    }
  }, [examYears, selectedYear]);

  async function startExamSession(examId, title, chapterId = null, allYears = false) {
    setExamLoading(true);
    setActiveExamCtx({ examId, title, chapterId, allYears });
    setSelectedAnswers({});
    setExamResult(null);
    setReviewWrongOnly(false);
    setActiveOrganizeMode("year_topic");
    setActiveYearFilter("all");
    setActiveTopicFilter("all");
    try {
      const params = new URLSearchParams();
      if (chapterId) params.set("chapterId", chapterId);
      if (allYears) params.set("allYears", "true");
      const qs = params.toString();
      const url = `/exams/${examId}/start${qs ? `?${qs}` : ""}`;
      const res = await mobileApi(url, {
        method: "POST",
        body: JSON.stringify({
          ...(chapterId ? { chapterId } : {}),
          ...(allYears ? { allYears: true } : {})
        })
      });
      setAttemptId(res.attempt._id);
      setExamQuestions(res.exam?.questions || res.questions || []);
      if (res.exam?.title) {
        setActiveExamCtx((prev) => (prev ? { ...prev, title: res.exam.title, examYear: res.exam.examYear } : prev));
      }
    } catch {
      setActiveExamCtx(null);
    } finally {
      setExamLoading(false);
    }
  }

  async function submitExamSession() {
    if (!attemptId) return;
    setExamLoading(true);
    try {
      const answers = examQuestions.map((q) => ({
        questionId: q._id,
        selectedOptionKeys: selectedAnswers[q._id] ? [selectedAnswers[q._id]] : [],
        response: selectedAnswers[q._id] || ""
      }));
      const res = await mobileApi(`/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers })
      });
      setExamResult(res.attempt);
    } catch {
      // ignore
    } finally {
      setExamLoading(false);
    }
  }

  async function toggleBookmark(qId) {
    try {
      const res = await mobileApi("/bookmarks/toggle", {
        method: "POST",
        body: JSON.stringify({ questionId: qId })
      });
      setBookmarkedIds((prev) => ({ ...prev, [qId]: res.bookmarked }));
    } catch {
      // ignore
    }
  }

  async function switchStream(newStream) {
    try {
      const res = await mobileApi("/auth/stream", {
        method: "PATCH",
        body: JSON.stringify({ stream: newStream })
      });
      if (res.user) {
        setSimUser(res.user);
        localStorage.setItem(SIM_USER_KEY, JSON.stringify(res.user));
      }
    } catch {
      // ignore
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!payRef.trim()) return;
    setPayNotice("");
    try {
      await mobileApi("/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: 300,
          currency: "ETB",
          method: payMethod,
          reference: payRef.trim()
        })
      });
      setPayRef("");
      setPayNotice("Payment reference submitted! Waiting for Cash Manager verification.");
      const payRes = await mobileApi("/payments").catch(() => ({ payments: [] }));
      setPayments(payRes.payments || []);
    } catch (err) {
      setPayNotice(err.message);
    }
  }

  const simToken = simUser ? localStorage.getItem(SIM_TOKEN_KEY) || "" : "";
  const { isOnline, swReady, syncing, cacheStats, syncOfflinePack } = useServiceWorkerCache(simToken);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Info Banner & Architecture Summary */}
      <div className="panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #007A4D, #0F47AF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff"
              }}
            >
              <SmartphoneIcon size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                EthioPrep Mobile Student App — Live Interactive Runtime &amp; Architecture
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-3)", margin: "2px 0 0" }}>
                Expo SDK 58 • React Native 0.88 • Connected live to <code>/api/*</code> (33 Subjects • 245 Units • 46 ESSLCE Exams • 3,783 Questions)
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <OfflineStatusPill
              isOnline={isOnline}
              swReady={swReady}
              syncing={syncing}
              cacheStats={cacheStats}
              onSync={() => syncOfflinePack()}
            />
            <PWAInstallButton />
            {onBackToPortal && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToPortal}>
                <ArrowLeftIcon size={15} /> Back to Staff Portal
              </button>
            )}
          </div>
        </div>
      </div>

      <OfflineBanner isOnline={isOnline} cacheStats={cacheStats} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 430px) 1fr", gap: 24, alignItems: "start" }}>
        {/* LEFT COLUMN: Screenshot-Matched Showcase + Interactive Phone Frame */}
        <div
          style={{
            background: "linear-gradient(165deg, #F0F7FF 0%, #F5F3FF 52%, #FDF4FF 100%)",
            borderRadius: 28,
            padding: "22px 18px 24px",
            border: "1px solid #E0E7FF",
            boxShadow: "0 16px 40px rgba(37, 99, 235, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          {/* Top Headline from Screenshot */}
          <div style={{ textAlign: "center", marginBottom: 14, maxWidth: 340 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1.15,
                color: "#0F172A",
                letterSpacing: "-0.03em"
              }}
            >
              Practice with
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #1D4ED8 0%, #4F46E5 50%, #9333EA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                real past exams
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#64748B",
                margin: "6px 0 0",
                lineHeight: 1.4,
                fontWeight: 500
              }}
            >
              Past papers, Entrances and Models organized by year and exam title.
            </p>
          </div>

          {/* Quick Course / Screen Switcher Pills */}
          {simUser && subjects.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 14
              }}
            >
              {[
                { label: "Mathematics", match: "math" },
                { label: "Biology", match: "bio" },
                { label: "Physics", match: "phys" },
                { label: "Chemistry", match: "chem" },
                { label: "English", match: "eng" },
                { label: "SAT", match: "sat" }
              ].map((preset) => {
                const found =
                  subjects.find(
                    (s) =>
                      String(s.name || "").toLowerCase().includes(preset.match) &&
                      s.gradeLevel === "grade-12"
                  ) ||
                  subjects.find((s) => String(s.name || "").toLowerCase().includes(preset.match));
                if (!found) return null;
                const isSelected =
                  selectedSubject &&
                  (String(selectedSubject._id) === String(found._id) ||
                    getBaseSubjectCode(selectedSubject.code) === getBaseSubjectCode(found.code));
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setActiveExamCtx(null);
                      setReadingNote(null);
                      setSelectedSubject(found);
                      setSubjectTab("practice");
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      border: isSelected ? "1.5px solid #2563EB" : "1px solid #CBD5E1",
                      background: isSelected ? "#EFF6FF" : "#FFFFFF",
                      color: isSelected ? "#1D4ED8" : "#475569",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {found.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setActiveExamCtx(null);
                  setReadingNote(null);
                  setSelectedSubject(null);
                  setTab("exams");
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: !selectedSubject && tab === "exams" ? "1.5px solid #2563EB" : "1px solid #CBD5E1",
                  background: !selectedSubject && tab === "exams" ? "#EFF6FF" : "#FFFFFF",
                  color: !selectedSubject && tab === "exams" ? "#1D4ED8" : "#475569",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                All Exams Tab
              </button>
            </div>
          )}

          {/* White-Bezel Phone Frame matching Screenshot */}
          <div
            style={{
              width: "100%",
              maxWidth: 386,
              margin: "0 auto",
              height: 850,
              background: "#F8FAFC",
              color: "#0F172A",
              borderRadius: 42,
              border: "10px solid #FFFFFF",
              boxShadow: "0 24px 60px rgba(37, 99, 235, 0.16), 0 0 0 1.5px #E2E8F0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {/* Phone Status Bar matching Screenshot (9:41 + Signal/Wifi/Battery) */}
            <div
              style={{
                background: "#FFFFFF",
                color: "#0F172A",
                padding: "10px 22px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 800
              }}
            >
              <span>9:41</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isOnline ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: "#FEF3C7",
                      color: "#B45309",
                      border: "1px solid #F59E0B",
                      borderRadius: 999,
                      padding: "1px 6px",
                      fontSize: 9.5,
                      fontWeight: 800
                    }}
                  >
                    <WifiOffIcon size={10} /> OFFLINE
                  </span>
                ) : (
                  <WifiIcon size={13} />
                )}
                <span style={{ fontSize: 11, fontWeight: 900 }}>▲</span>
                <span
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 10,
                    borderRadius: 3,
                    background: "#0F172A"
                  }}
                />
              </span>
            </div>

            {/* Phone Screen Body */}
            {!simUser ? (
              <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", background: "#fff" }}>
                <div style={{ textAlign: "center", marginBottom: 22 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                      color: "#fff",
                      fontSize: 24,
                      fontWeight: 900,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10
                    }}
                  >
                    E
                  </div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>EthioPrep Student</h3>
                  <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    Grade 9–12 Entrance Exam Preparation
                  </p>
                </div>

                {authError && (
                  <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 12px", borderRadius: 10, fontSize: 12, marginBottom: 12 }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleStudentLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Student Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        background: "#F9FAFB",
                        color: "#111827",
                        fontSize: 13
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        background: "#F9FAFB",
                        color: "#111827",
                        fontSize: 13
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{
                      marginTop: 6,
                      padding: "12px",
                      borderRadius: 12,
                      border: "none",
                      background: "#2563EB",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer"
                    }}
                  >
                    {authLoading ? "Signing in…" : "Sign In as Student (Abebe Kebede)"}
                  </button>
                </form>

                <div style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 11.5, color: "#1E40AF" }}>
                  <strong>Pre-filled Demo Student Account:</strong>
                  <div>Email: <code>student@ethioprep.com</code></div>
                  <div>Password: <code>studentPassword123</code></div>
                </div>
              </div>
            ) : activeExamCtx ? (
              /* ACTIVE EXAM SCREEN (ExamActiveScreen.js — Organized by Year & Topic) */
              (() => {
                const enrichedQuestions = examQuestions.map((q, idx) => {
                  const detail = examResult
                    ? (examResult.questionResults || examResult.answers || []).find((a) => String(a.questionId) === String(q._id))
                    : null;
                  const resolvedYear = String(q.examYear || activeExamCtx.examYear || "2016");
                  const resolvedTopic = q.chapterTitle || q.topic || "General Curriculum Topic";
                  const gradeMatch = String(q.gradeLevel || "").match(/grade-(\d+)/i);
                  const resolvedGrade = gradeMatch ? `G${gradeMatch[1]}` : "";
                  return {
                    ...q,
                    originalIndex: idx + 1,
                    detail,
                    isCorrect: detail ? Boolean(detail.isCorrect) : true,
                    resolvedYear,
                    resolvedTopic,
                    resolvedGrade
                  };
                });

                const activeYears = Array.from(new Set(enrichedQuestions.map((q) => q.resolvedYear))).sort((a, b) =>
                  b.localeCompare(a, undefined, { numeric: true })
                );

                const activeTopicsMap = new Map();
                enrichedQuestions.forEach((q) => {
                  if (activeYearFilter !== "all" && q.resolvedYear !== activeYearFilter) return;
                  if (!activeTopicsMap.has(q.resolvedTopic)) {
                    activeTopicsMap.set(q.resolvedTopic, {
                      topic: q.resolvedTopic,
                      grade: q.resolvedGrade,
                      count: 0
                    });
                  }
                  activeTopicsMap.get(q.resolvedTopic).count += 1;
                });
                const activeTopics = Array.from(activeTopicsMap.values());

                const visibleQuestions = enrichedQuestions.filter((q) => {
                  if (examResult && reviewWrongOnly && q.isCorrect) return false;
                  if (activeYearFilter !== "all" && q.resolvedYear !== activeYearFilter) return false;
                  if (activeTopicFilter !== "all" && q.resolvedTopic !== activeTopicFilter) return false;
                  return true;
                });

                const yearTopicGroups = [];
                if (activeOrganizeMode === "year_topic") {
                  const gMap = new Map();
                  visibleQuestions.forEach((q) => {
                    const gKey = `${q.resolvedYear}__${q.resolvedTopic}`;
                    if (!gMap.has(gKey)) {
                      gMap.set(gKey, {
                        key: gKey,
                        year: q.resolvedYear,
                        topic: q.resolvedTopic,
                        grade: q.resolvedGrade,
                        items: []
                      });
                    }
                    gMap.get(gKey).items.push(q);
                  });
                  yearTopicGroups.push(...gMap.values());
                }

                const renderSimQuestionCard = (q) => {
                  const detail = q.detail;
                  const chosen = selectedAnswers[q._id];
                  return (
                    <div key={q._id} style={{ background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#2563EB", padding: "2px 7px", borderRadius: 6 }}>
                            Q{q.originalIndex}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: "#1E40AF", background: "#DBEAFE", padding: "2px 7px", borderRadius: 6 }}>
                            {q.resolvedYear} E.C.
                          </span>
                          {q.resolvedGrade && (
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#4338CA", background: "#E0E7FF", padding: "2px 6px", borderRadius: 6 }}>
                              {q.resolvedGrade}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(q._id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: bookmarkedIds[q._id] ? "#F59E0B" : "#9CA3AF" }}
                          title="Bookmark question"
                        >
                          ★
                        </button>
                      </div>

                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF", background: "#EFF6FF", padding: "4px 8px", borderRadius: 6, marginBottom: 8 }}>
                        Topic: {q.resolvedTopic}
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", lineHeight: 1.45, marginBottom: 10 }}>
                        {formatMathText(q.prompt || q.stem)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(q.options || []).map((opt) => {
                          const isChosen = chosen === opt.key;
                          const isCorrect = detail && detail.correctAnswer === opt.key;
                          const isWrongChosen = detail && isChosen && !detail.isCorrect;
                          let bg = isChosen ? "#EFF6FF" : "#F9FAFB";
                          let border = isChosen ? "#2563EB" : "#E5E7EB";
                          if (detail) {
                            if (isCorrect) {
                              bg = "#DCFCE7";
                              border = "#16A34A";
                            } else if (isWrongChosen) {
                              bg = "#FEE2E2";
                              border = "#DC2626";
                            }
                          }
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              disabled={Boolean(examResult)}
                              onClick={() => setSelectedAnswers((prev) => ({ ...prev, [q._id]: opt.key }))}
                              style={{
                                textAlign: "left",
                                padding: "8px 10px",
                                borderRadius: 9,
                                border: `1.5px solid ${border}`,
                                background: bg,
                                color: "#111827",
                                fontSize: 12.5,
                                cursor: examResult ? "default" : "pointer",
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start"
                              }}
                            >
                              <strong style={{ color: "#2563EB", minWidth: 18 }}>{opt.key}.</strong>
                              <span style={{ flex: 1 }}>{formatMathText(opt.text)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {detail && (
                        <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#F0FDF4", borderLeft: "3px solid #16A34A", fontSize: 11.5, color: "#065F46" }}>
                          <strong>Correct Answer: {detail.correctAnswer}</strong>
                          {(detail.explanation || q.explanation) && (
                            <div style={{ marginTop: 4, lineHeight: 1.4 }}>{formatMathText(detail.explanation || q.explanation)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F3F4F6" }}>
                    <div
                      style={{
                        background: "linear-gradient(135deg, #2563EB 0%, #6366F1 55%, #7C3AED 100%)",
                        color: "#fff",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveExamCtx(null)}
                        style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >
                        ← Exit
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {activeExamCtx.title}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.9 }}>
                          {examQuestions.length} Qs • {Object.keys(selectedAnswers).length} Answered • {activeTopics.length} Topics
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {examLoading && examQuestions.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>Loading exam questions…</div>
                      ) : (
                        <>
                          {/* Organize Active Exam by Year & Topic Control Card */}
                          <div style={{ background: "#fff", borderRadius: 12, padding: 10, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => setActiveOrganizeMode("year_topic")}
                                style={{
                                  flex: 1,
                                  padding: "7px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #2563EB",
                                  background: activeOrganizeMode === "year_topic" ? "#2563EB" : "#fff",
                                  color: activeOrganizeMode === "year_topic" ? "#fff" : "#2563EB",
                                  fontWeight: 800,
                                  fontSize: 11,
                                  cursor: "pointer"
                                }}
                              >
                                By Year &amp; Topic ({yearTopicGroups.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveOrganizeMode("sequential")}
                                style={{
                                  flex: 1,
                                  padding: "7px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #2563EB",
                                  background: activeOrganizeMode === "sequential" ? "#2563EB" : "#fff",
                                  color: activeOrganizeMode === "sequential" ? "#fff" : "#2563EB",
                                  fontWeight: 800,
                                  fontSize: 11,
                                  cursor: "pointer"
                                }}
                              >
                                Sequential (Q1–Q{examQuestions.length})
                              </button>
                            </div>

                            {/* Year Filter Pills inside Active Exam */}
                            <div>
                              <div style={{ fontSize: 10.5, fontWeight: 800, color: "#4B5563", marginBottom: 4 }}>Filter by Exam Year:</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => setActiveYearFilter("all")}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 12,
                                    border: "1px solid #D1D5DB",
                                    background: activeYearFilter === "all" ? "#2563EB" : "#F9FAFB",
                                    color: activeYearFilter === "all" ? "#fff" : "#374151",
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  All Years ({enrichedQuestions.length})
                                </button>
                                {activeYears.map((yr) => {
                                  const c = enrichedQuestions.filter((q) => q.resolvedYear === yr).length;
                                  const isAct = activeYearFilter === yr;
                                  return (
                                    <button
                                      key={yr}
                                      type="button"
                                      onClick={() => setActiveYearFilter(yr)}
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 12,
                                        border: "1px solid #D1D5DB",
                                        background: isAct ? "#2563EB" : "#F9FAFB",
                                        color: isAct ? "#fff" : "#374151",
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        cursor: "pointer"
                                      }}
                                    >
                                      {yr} E.C. ({c})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Topic Filter Pills inside Active Exam */}
                            {activeTopics.length > 0 && (
                              <div>
                                <div style={{ fontSize: 10.5, fontWeight: 800, color: "#4B5563", marginBottom: 4 }}>Filter by Topic / Unit:</div>
                                <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTopicFilter("all")}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 12,
                                      border: "1px solid #D1D5DB",
                                      background: activeTopicFilter === "all" ? "#4F46E5" : "#F9FAFB",
                                      color: activeTopicFilter === "all" ? "#fff" : "#374151",
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      cursor: "pointer"
                                    }}
                                  >
                                    All Topics ({activeTopics.length})
                                  </button>
                                  {activeTopics.map((tp) => {
                                    const isAct = activeTopicFilter === tp.topic;
                                    return (
                                      <button
                                        key={tp.topic}
                                        type="button"
                                        onClick={() => setActiveTopicFilter(tp.topic)}
                                        style={{
                                          padding: "4px 8px",
                                          borderRadius: 12,
                                          border: "1px solid #D1D5DB",
                                          background: isAct ? "#4F46E5" : "#F9FAFB",
                                          color: isAct ? "#fff" : "#374151",
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          whiteSpace: "nowrap",
                                          cursor: "pointer"
                                        }}
                                      >
                                        {tp.grade ? `${tp.grade} · ` : ""}{tp.topic.split(":")[0]} ({tp.count})
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {examResult && (
                            <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "2px solid #2563EB" }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: "#2563EB" }}>
                                Score: {examResult.score} / {examResult.totalMarks || examResult.totalQuestions || examQuestions.length} ({examResult.percentage}%)
                              </div>
                              <div style={{ fontSize: 12, color: "#4B5563", marginTop: 4 }}>
                                Review the full worked explanations organized by Year &amp; Topic below.
                              </div>
                              <button
                                type="button"
                                onClick={() => setReviewWrongOnly((v) => !v)}
                                style={{
                                  marginTop: 8,
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #DC2626",
                                  background: reviewWrongOnly ? "#DC2626" : "#FEF2F2",
                                  color: reviewWrongOnly ? "#fff" : "#DC2626",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                {reviewWrongOnly ? "Showing Mistakes Only (Tap for All)" : "Filter Mistakes Only"}
                              </button>
                            </div>
                          )}

                          {activeOrganizeMode === "year_topic" ? (
                            yearTopicGroups.map((group) => (
                              <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div
                                  style={{
                                    background: "#EFF6FF",
                                    borderLeft: "4px solid #2563EB",
                                    borderRadius: 10,
                                    padding: "8px 10px"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, background: "#2563EB", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                                      {group.year} E.C.
                                    </span>
                                    {group.grade && (
                                      <span style={{ fontSize: 10, fontWeight: 800, background: "#fff", color: "#2563EB", padding: "2px 6px", borderRadius: 4, border: "1px solid #BFDBFE" }}>
                                        {group.grade}
                                      </span>
                                    )}
                                    <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 800, color: "#1E40AF" }}>
                                      {group.items.length} {group.items.length === 1 ? "Question" : "Questions"}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1E3A8A" }}>
                                    {group.topic}
                                  </div>
                                </div>
                                {group.items.map((q) => renderSimQuestionCard(q))}
                              </div>
                            ))
                          ) : (
                            visibleQuestions.map((q) => renderSimQuestionCard(q))
                          )}

                          {!examResult && examQuestions.length > 0 && (
                            <button
                              type="button"
                              onClick={submitExamSession}
                              disabled={examLoading}
                              style={{
                                padding: "13px",
                                borderRadius: 12,
                                border: "none",
                                background: "linear-gradient(135deg, #2563EB, #6366F1)",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 14,
                                cursor: "pointer"
                              }}
                            >
                              {examLoading ? "Grading Exam…" : "Submit Exam & View Explanations"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : selectedSubject ? (
              /* SUBJECT DETAIL SCREEN (SubjectScreen.js — Exact Screenshot Match!) */
              (() => {
                const yearGroups = buildSubjectYearPracticeGroups(
                  subjectExams,
                  subjectSearchQuery,
                  subjectCategoryFilter
                );
                const heroTitle = selectedSubject.name;

                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F8FAFC" }}>
                    {/* Blue-to-Purple Gradient Hero Header matching Screenshot */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #2563EB 0%, #5850EC 52%, #7C3AED 100%)",
                        color: "#FFFFFF",
                        padding: "12px 18px 28px",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center"
                      }}
                    >
                      {/* Top-left back arrow */}
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          aria-label="Back to subjects"
                          onClick={() => {
                            if (readingNote) {
                              setReadingNote(null);
                            } else {
                              setSelectedSubject(null);
                              setSelectedYear(null);
                            }
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#FFFFFF",
                            padding: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <ArrowLeftIcon size={20} strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* Centered Open Book Illustration */}
                      <div style={{ marginTop: 2, marginBottom: 8 }}>
                        <OpenBookHeroIllustration />
                      </div>

                      {/* Centered Bold White Subject Title */}
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#FFFFFF",
                          textAlign: "center",
                          letterSpacing: "-0.02em"
                        }}
                      >
                        {heroTitle}
                      </div>
                    </div>

                    {/* White Rounded Top Sheet + 4 Horizontal Tabs (Practice | Insights | Lectures | Docs) */}
                    <div
                      style={{
                        background: "#FFFFFF",
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        marginTop: -16,
                        position: "relative",
                        zIndex: 2,
                        padding: "6px 14px 0",
                        borderBottom: "1px solid #F1F5F9",
                        display: "flex",
                        justifyContent: "space-around"
                      }}
                    >
                      {[
                        { id: "practice", label: "Practice" },
                        { id: "insights", label: "Insights" },
                        { id: "lectures", label: "Lectures" },
                        { id: "docs", label: "Docs" }
                      ].map((t) => {
                        const isActive = subjectTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setReadingNote(null);
                              setSubjectTab(t.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "10px 8px 11px",
                              fontSize: 13,
                              fontWeight: isActive ? 800 : 600,
                              color: isActive ? "#2563EB" : "#94A3B8",
                              cursor: "pointer",
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center"
                            }}
                          >
                            <span>{t.label}</span>
                            {isActive && (
                              <span
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  width: 34,
                                  height: 3.5,
                                  borderRadius: 999,
                                  background: "#2563EB"
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {readingNote ? (
                      <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#fff" }}>
                        <button
                          type="button"
                          onClick={() => setReadingNote(null)}
                          style={{
                            border: "none",
                            background: "#EFF6FF",
                            color: "#2563EB",
                            padding: "5px 10px",
                            borderRadius: 8,
                            fontSize: 11.5,
                            fontWeight: 800,
                            cursor: "pointer",
                            marginBottom: 10
                          }}
                        >
                          ← Back to Lectures
                        </button>
                        <h4 style={{ margin: "6px 0 8px", fontSize: 15, color: "#0F172A" }}>{readingNote.title}</h4>
                        <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                          {readingNote.content || readingNote.body}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "14px 14px 20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 14
                        }}
                      >
                        {/* ────── PRACTICE TAB: Collapsible Year Cards organized by Year & Exam Title ────── */}
                        {subjectTab === "practice" && (
                          <>
                            {/* Filter Pills: All | Entrances | Models | Past Papers */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {[
                                { id: "all", label: "All Papers" },
                                { id: "entrance", label: "Entrances" },
                                { id: "model", label: "Models" },
                                { id: "past_paper", label: "Past Papers" }
                              ].map((pill) => {
                                const active = subjectCategoryFilter === pill.id;
                                return (
                                  <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => setSubjectCategoryFilter(pill.id)}
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 999,
                                      border: active ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                                      background: active ? "#EFF6FF" : "#FFFFFF",
                                      color: active ? "#1D4ED8" : "#64748B",
                                      fontSize: 11,
                                      fontWeight: 800,
                                      cursor: "pointer"
                                    }}
                                  >
                                    {pill.label}
                                  </button>
                                );
                              })}
                            </div>

                            {yearGroups.map((group) => {
                              const isCollapsed = Boolean(collapsedYears[group.year]);
                              return (
                                <div
                                  key={group.year}
                                  style={{
                                    background: "#FFFFFF",
                                    borderRadius: 18,
                                    padding: "14px 14px",
                                    border: "1px solid #F1F5F9",
                                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10
                                  }}
                                >
                                  {/* Year Card Header: "2018 E.C. Exams" + Blue Chevron */}
                                  <button
                                    type="button"
                                    onClick={() => toggleYearCollapse(group.year)}
                                    aria-expanded={!isCollapsed}
                                    style={{
                                      width: "100%",
                                      background: "none",
                                      border: "none",
                                      padding: "2px 2px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      cursor: "pointer"
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "#0F172A",
                                        letterSpacing: "-0.01em"
                                      }}
                                    >
                                      {group.heading}
                                    </span>
                                    <span style={{ color: "#2563EB", display: "flex", alignItems: "center" }}>
                                      {isCollapsed ? <ChevronDownIcon size={18} strokeWidth={2.5} /> : <ChevronUpIcon size={18} strokeWidth={2.5} />}
                                    </span>
                                  </button>

                                  {/* Exam Rows inside Year Card (Entrances, Models, Past Papers by Exam Title) */}
                                  {!isCollapsed && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                      {group.items.map((item) => {
                                        const isFav = Boolean(favoriteExamIds[item.id]);
                                        return (
                                          <div
                                            key={item.id}
                                            style={{
                                              background: "#F8FAFC",
                                              borderRadius: 14,
                                              padding: "11px 12px",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 12,
                                              border: "1px solid #F1F5F9"
                                            }}
                                          >
                                            {/* Main clickable area to start exam */}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                startExamSession(
                                                  item.examId,
                                                  item.fullTitle,
                                                  item.chapterId
                                                )
                                              }
                                              style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 12,
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                textAlign: "left",
                                                cursor: "pointer"
                                              }}
                                            >
                                              {/* Circular Soft-Blue Question Booklet Icon Badge */}
                                              <div
                                                style={{
                                                  width: 42,
                                                  height: 42,
                                                  borderRadius: 21,
                                                  background: "#EFF6FF",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  flexShrink: 0
                                                }}
                                              >
                                                <QuestionBookletIcon size={22} />
                                              </div>

                                              {/* Title & Subtitle */}
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                  style={{
                                                    fontSize: 13.5,
                                                    fontWeight: 800,
                                                    color: "#0F172A",
                                                    marginBottom: 2
                                                  }}
                                                >
                                                  {item.title}
                                                </div>
                                                <div
                                                  style={{
                                                    fontSize: 11.5,
                                                    color: "#94A3B8",
                                                    fontWeight: 600
                                                  }}
                                                >
                                                  {item.subtitle}
                                                </div>
                                              </div>
                                            </button>

                                            {/* Right Heart Icon Button */}
                                            <button
                                              type="button"
                                              aria-label={`Favorite ${group.year} ${item.title}`}
                                              onClick={(e) => toggleFavoriteExam(item.id, e)}
                                              style={{
                                                background: "none",
                                                border: "none",
                                                padding: 6,
                                                cursor: "pointer",
                                                color: isFav ? "#EF4444" : "#94A3B8",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                              }}
                                            >
                                              <HeartIcon
                                                size={18}
                                                fill={isFav ? "#EF4444" : "none"}
                                                strokeWidth={1.9}
                                              />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}

                        {/* ────── INSIGHTS TAB: Topic & Curriculum Breakdown ────── */}
                        {subjectTab === "insights" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div
                              style={{
                                background: "#FFFFFF",
                                borderRadius: 16,
                                padding: 14,
                                border: "1px solid #F1F5F9"
                              }}
                            >
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>
                                Topic &amp; Chapter Weighting ({subjectChapters.length} Units)
                              </div>
                              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                                Practice past exam questions organized by Grade 9–12 syllabus topics.
                              </div>
                            </div>

                            {subjectChapters.map((ch) => {
                              const matchingExam = subjectExams.find((ex) =>
                                (ex.chapterBreakdown || []).some((cb) => String(cb.chapterId) === String(ch._id))
                              ) || subjectExams[0];
                              return (
                                <div
                                  key={ch._id}
                                  style={{
                                    background: "#FFFFFF",
                                    borderRadius: 14,
                                    padding: 12,
                                    border: "1px solid #F1F5F9",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 19,
                                      background: "#EFF6FF",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}
                                  >
                                    <QuestionBookletIcon size={20} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#2563EB" }}>
                                      {formatGradeLabel(ch.gradeLevel)} • Unit {ch.order}
                                    </div>
                                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>
                                      {ch.title}
                                    </div>
                                  </div>
                                  {matchingExam && (
                                    <button
                                      type="button"
                                      onClick={() => startExamSession(matchingExam._id, ch.title, ch._id)}
                                      style={{
                                        padding: "6px 10px",
                                        borderRadius: 8,
                                        border: "none",
                                        background: "#EFF6FF",
                                        color: "#2563EB",
                                        fontSize: 11,
                                        fontWeight: 800,
                                        cursor: "pointer"
                                      }}
                                    >
                                      Practice
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ────── LECTURES TAB: Study Notes & Lectures ────── */}
                        {subjectTab === "lectures" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {subjectNotes.length === 0 ? (
                              <div style={{ background: "#fff", borderRadius: 14, padding: 20, textAlign: "center", color: "#64748B", fontSize: 12.5 }}>
                                Select a unit below to read its curriculum lecture summary.
                              </div>
                            ) : (
                              subjectNotes.map((n) => (
                                <div key={n._id} style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #F1F5F9" }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>{n.title}</div>
                                  <div style={{ fontSize: 11.5, color: "#64748B", margin: "4px 0 10px" }}>
                                    {String(n.content || n.body || "").slice(0, 100)}…
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReadingNote(n)}
                                    style={{
                                      padding: "7px 12px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: "#EFF6FF",
                                      color: "#2563EB",
                                      fontWeight: 800,
                                      fontSize: 11.5,
                                      cursor: "pointer"
                                    }}
                                  >
                                    Open Lecture Note →
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* ────── DOCS TAB: Favorited Exams & Saved Reference Docs ────── */}
                        {subjectTab === "docs" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #F1F5F9" }}>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F172A" }}>
                                Saved Past Papers, Entrances &amp; Models
                              </div>
                              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
                                Tap the heart icon (♡) on any Past Paper, Entrance Exam, or Regional Model Exam in Practice to save it here for quick offline revision.
                              </div>
                            </div>
                            {yearGroups
                              .flatMap((g) => g.items)
                              .filter((item) => favoriteExamIds[item.id])
                              .map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    background: "#fff",
                                    borderRadius: 14,
                                    padding: 12,
                                    border: "1px solid #F1F5F9",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>
                                      {item.year} E.C. • {item.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{item.subtitle}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => startExamSession(item.examId, item.fullTitle, item.chapterId)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: 8,
                                      border: "none",
                                      background: "#2563EB",
                                      color: "#fff",
                                      fontSize: 11.5,
                                      fontWeight: 800,
                                      cursor: "pointer"
                                    }}
                                  >
                                    Start
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* MAIN 5 TABS (Home, Exams, Progress, Pay, Profile) */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Tab Header */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #2563EB 0%, #5850EC 52%, #7C3AED 100%)",
                    color: "#fff",
                    padding: "14px 16px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.9 }}>Selam, {simUser.displayName}</div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {userStream === "natural" ? "Natural Science Stream" : "Social Science Stream"}
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, background: "rgba(255,255,255,0.22)", padding: "4px 8px", borderRadius: 8 }}>
                      {simUser.isPremium ? "PREMIUM" : "FREE"}
                    </span>
                  </div>
                </div>

                {/* Scrollable Tab Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                  {tab === "home" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Grade 9-12 Selector Pills */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {GRADES.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGrade(g.id)}
                            style={{
                              flex: 1,
                              padding: "8px 4px",
                              borderRadius: 10,
                              border: "none",
                              background: selectedGrade === g.id ? "#2563EB" : "#E2E8F0",
                              color: selectedGrade === g.id ? "#fff" : "#334155",
                              fontWeight: 800,
                              fontSize: 11.5,
                              cursor: "pointer"
                            }}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>
                        {formatGradeLabel(selectedGrade)} Courses ({filteredHomeSubjects.length})
                      </div>

                      {dataLoading ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading curriculum…</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {filteredHomeSubjects.map((subj) => (
                            <button
                              key={subj._id}
                              type="button"
                              onClick={() => {
                                setSelectedSubject(subj);
                                setSubjectTab("practice");
                              }}
                              style={{
                                textAlign: "left",
                                background: "#fff",
                                borderRadius: 14,
                                padding: 12,
                                border: "1px solid #E2E8F0",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                minHeight: 104
                              }}
                            >
                              <div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#2563EB", background: "#EFF6FF", padding: "2px 6px", borderRadius: 5 }}>
                                  {subj.code}
                                </span>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginTop: 6, lineHeight: 1.25 }}>
                                  {subj.name}
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 700, marginTop: 8 }}>
                                Open Past Exams →
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "exams" && (
                    (() => {
                      const streamExams = allExams.filter((ex) => {
                        const sObj = typeof ex.subjectId === "object" && ex.subjectId ? ex.subjectId : ex.subject;
                        const sStream = sObj?.stream;
                        if (sStream) return sStream === "both" || sStream === userStream;
                        return true;
                      });

                      const yearGroupsAll = buildAllExamsYearGroups(
                        streamExams,
                        examsTabSearchQuery,
                        examsTabCategoryFilter
                      );

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* Real-Time Search Bar by Exam Title */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              background: "#fff",
                              borderRadius: 12,
                              border: "1px solid #E2E8F0",
                              padding: "8px 12px"
                            }}
                          >
                            <span style={{ fontSize: 13, color: "#64748B" }}>🔍</span>
                            <input
                              type="text"
                              value={examsTabSearchQuery}
                              onChange={(e) => setExamsTabSearchQuery(e.target.value)}
                              placeholder="Search past papers, Entrances & Models by exam title..."
                              style={{
                                flex: 1,
                                border: "none",
                                outline: "none",
                                fontSize: 12,
                                color: "#0F172A",
                                background: "transparent"
                              }}
                            />
                            {examsTabSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setExamsTabSearchQuery("")}
                                aria-label="Clear search"
                                style={{
                                  border: "none",
                                  background: "#E2E8F0",
                                  color: "#334155",
                                  borderRadius: 999,
                                  width: 18,
                                  height: 18,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer"
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>

                          {/* Category Pills: All Papers | Entrances | Models */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {[
                              { id: "all", label: "All Past Papers" },
                              { id: "entrance", label: "Entrances (ESSLCE)" },
                              { id: "model", label: "Regional Models" }
                            ].map((pill) => {
                              const active = examsTabCategoryFilter === pill.id;
                              return (
                                <button
                                  key={pill.id}
                                  type="button"
                                  onClick={() => setExamsTabCategoryFilter(pill.id)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    border: active ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                                    background: active ? "#EFF6FF" : "#FFFFFF",
                                    color: active ? "#1D4ED8" : "#64748B",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: "pointer"
                                  }}
                                >
                                  {pill.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Collapsible Year Cards organized by Year & Exam Title */}
                          {yearGroupsAll.map((group) => {
                            const collapseKey = `all_${group.year}`;
                            const isCollapsed = Boolean(collapsedYears[collapseKey]);
                            return (
                              <div
                                key={group.year}
                                style={{
                                  background: "#FFFFFF",
                                  borderRadius: 18,
                                  padding: 14,
                                  border: "1px solid #F1F5F9",
                                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 10
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleYearCollapse(collapseKey)}
                                  aria-expanded={!isCollapsed}
                                  style={{
                                    width: "100%",
                                    background: "none",
                                    border: "none",
                                    padding: "2px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    cursor: "pointer"
                                  }}
                                >
                                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                                    {group.heading}
                                  </span>
                                  <span style={{ color: "#2563EB", display: "flex", alignItems: "center" }}>
                                    {isCollapsed ? <ChevronDownIcon size={18} strokeWidth={2.5} /> : <ChevronUpIcon size={18} strokeWidth={2.5} />}
                                  </span>
                                </button>

                                {!isCollapsed && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {group.exams.map((ex) => {
                                      const isFav = Boolean(favoriteExamIds[ex._id]);
                                      return (
                                        <div
                                          key={ex._id}
                                          style={{
                                            background: "#F8FAFC",
                                            borderRadius: 14,
                                            padding: "11px 12px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            border: "1px solid #F1F5F9"
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => startExamSession(ex._id, ex.title)}
                                            style={{
                                              flex: 1,
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 12,
                                              background: "none",
                                              border: "none",
                                              padding: 0,
                                              textAlign: "left",
                                              cursor: "pointer"
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 21,
                                                background: "#EFF6FF",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0
                                              }}
                                            >
                                              <QuestionBookletIcon size={22} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 2 }}>
                                                {ex.title}
                                              </div>
                                              <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600 }}>
                                                {ex.formattedSubtitle}
                                              </div>
                                            </div>
                                          </button>
                                          <button
                                            type="button"
                                            aria-label={`Favorite ${ex.title}`}
                                            onClick={(e) => toggleFavoriteExam(ex._id, e)}
                                            style={{
                                              background: "none",
                                              border: "none",
                                              padding: 6,
                                              cursor: "pointer",
                                              color: isFav ? "#EF4444" : "#94A3B8"
                                            }}
                                          >
                                            <HeartIcon size={18} fill={isFav ? "#EF4444" : "none"} strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}

                {tab === "progress" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                        🏆 Top Student Leaderboard
                      </div>
                      {leaderboard.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#6B7280" }}>Complete an exam session to appear on the national leaderboard!</div>
                      ) : (
                        leaderboard.slice(0, 8).map((row, i) => (
                          <div key={row.userId || i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: 12 }}>
                            <span>
                              <strong>#{i + 1}</strong> {row.displayName}
                            </span>
                            <strong style={{ color: "#007A4D" }}>{row.averageScore}% ({row.examsCompleted} exams)</strong>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                        ★ Saved Questions ({bookmarks.length})
                      </div>
                      {bookmarks.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#6B7280" }}>Tap ★ during any exam to bookmark questions for revision.</div>
                      ) : (
                        bookmarks.slice(0, 5).map((b) => (
                          <div key={b._id} style={{ fontSize: 12, color: "#374151", padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
                            {formatMathText(b.question?.stem || "Saved question")}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tab === "payment" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>EthioPrep Premium Pass</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#007A4D", margin: "4px 0" }}>300 ETB / Year</div>
                      <p style={{ fontSize: 11.5, color: "#6B7280", margin: "0 0 10px" }}>
                        Unlocks all 2013–2018 E.C. ESSLCE exams, worked explanations, and offline study notes.
                      </p>

                      {payNotice && (
                        <div style={{ padding: 8, borderRadius: 8, background: "#ECFDF5", color: "#065F46", fontSize: 11.5, marginBottom: 8 }}>
                          {payNotice}
                        </div>
                      )}

                      <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 12, background: "#fff", color: "#111827" }}
                        >
                          <option value="telebirr">Telebirr (0911-223344)</option>
                          <option value="cbe_birr">CBE Birr (100023456789)</option>
                          <option value="bank_transfer">Bank of Abyssinia</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Transaction Reference (e.g. TXN982341)"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 12, background: "#fff", color: "#111827" }}
                        />
                        <button
                          type="submit"
                          style={{ padding: 9, borderRadius: 8, border: "none", background: "#007A4D", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                        >
                          Submit Payment Receipt
                        </button>
                      </form>
                    </div>

                    <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Payment History ({payments.length})</div>
                      {payments.map((p) => (
                        <div key={p._id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "5px 0", borderBottom: "1px solid #F3F4F6" }}>
                          <span>{p.method} • {p.reference}</span>
                          <strong style={{ color: p.status === "verified" ? "#007A4D" : "#D97706" }}>{p.status}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "profile" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{simUser.displayName}</div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{simUser.email}</div>

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#374151", marginBottom: 6 }}>Academic Stream</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[
                            { id: "natural", label: "Natural Science" },
                            { id: "social", label: "Social Science" }
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => switchStream(st.id)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                borderRadius: 8,
                                border: "1px solid #007A4D",
                                background: userStream === st.id ? "#007A4D" : "#fff",
                                color: userStream === st.id ? "#fff" : "#007A4D",
                                fontWeight: 800,
                                fontSize: 11.5,
                                cursor: "pointer"
                              }}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleStudentLogout}
                        style={{
                          marginTop: 16,
                          width: "100%",
                          padding: "9px",
                          borderRadius: 8,
                          border: "1px solid #DC2626",
                          background: "#FEF2F2",
                          color: "#DC2626",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        Sign Out of Mobile App
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Bar matching Mobile/App.js */}
              <div
                style={{
                  background: "#fff",
                  borderTop: "1px solid #E5E7EB",
                  display: "flex",
                  padding: "6px 4px"
                }}
              >
                {[
                  { id: "home", label: "Home", icon: <HomeIcon size={16} /> },
                  { id: "exams", label: "Exams", icon: <GraduationCapIcon size={16} /> },
                  { id: "progress", label: "Rank", icon: <TrophyIcon size={16} /> },
                  { id: "payment", label: "Pay", icon: <CreditCardIcon size={16} /> },
                  { id: "profile", label: "Profile", icon: <UserIcon size={16} /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      color: tab === item.id ? "#007A4D" : "#6B7280",
                      fontWeight: tab === item.id ? 800 : 600,
                      fontSize: 10.5,
                      cursor: "pointer"
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* RIGHT COLUMN: Architectural Diagnostic & Analysis Report */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>
              Mobile Application Technical Analysis (<code>/Mobile</code>)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>RUNTIME &amp; SDK</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>Expo SDK 58 • RN 0.88.0</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                  React 19.3.0 with AsyncStorage offline caching, offline mutation queue, and automatic JWT refresh token rotation.
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>CURRICULUM COVERAGE</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>Grades 9, 10, 11 &amp; 12</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                  33 stream-filtered subjects, 245 syllabus chapters, and 46 ESSLCE &amp; Regional Model exams (2013–2018 E.C.).
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>EXAM &amp; UNIT RUNNER</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>Full Exam + Single Unit</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                  Supports timed full exams and chapter-filtered practice (`?chapterId=...`) with LaTeX math formatting and mistake review.
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800 }}>
              Screen-by-Screen Architecture Inventory
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Key Capabilities</th>
                    <th>API Endpoints Used</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>App.js</code></td>
                    <td>Auth gate, offline queue auto-sync every 20s, 5-tab bottom navigator</td>
                    <td><code>/auth/profile</code>, <code>/notes/sync</code></td>
                  </tr>
                  <tr>
                    <td><code>HomeScreen.js</code></td>
                    <td>Grade 9–12 selector pills, Natural/Social stream filtering, daily streak</td>
                    <td><code>/question-bank/subjects</code>, <code>/progress</code></td>
                  </tr>
                  <tr>
                    <td><code>SubjectScreen.js</code></td>
                    <td>By Year (2013–2018 E.C.), By Chapter (Grade 9–12 units), Protected Offline Notes</td>
                    <td><code>/exams</code>, <code>/question-bank/chapters</code></td>
                  </tr>
                  <tr>
                    <td><code>ExamsScreen.js</code></td>
                    <td>Real-time exam title search bar, By Year (2013–2018 E.C.), By Exam Title &amp; All Exams modes</td>
                    <td><code>GET /exams</code>, <code>POST /exams/:id/start</code></td>
                  </tr>
                  <tr>
                    <td><code>ExamActiveScreen.js</code></td>
                    <td>Organize by Year &amp; Topic or Sequential, timer, LaTeX math formatter, bookmark toggle, instant grading</td>
                    <td><code>POST /exams/:id/start</code>, <code>POST /exams/attempts/:id/submit</code></td>
                  </tr>
                  <tr>
                    <td><code>ProgressScreen.js</code></td>
                    <td>National Top 15 leaderboard, saved bookmarks revision, offline sync counter</td>
                    <td><code>/progress/leaderboard</code>, <code>/bookmarks</code></td>
                  </tr>
                  <tr>
                    <td><code>PaymentScreen.js</code></td>
                    <td>Telebirr, CBE Birr &amp; Bank receipt submission and verification status</td>
                    <td><code>POST /payments</code>, <code>GET /payments</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
