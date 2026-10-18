import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3Icon,
  BookMarkedIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  CreditCardIcon,
  CrownIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  FolderOpenIcon,
  HourglassIcon,
  ImageIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
  ZapIcon
} from "lucide-react";
import { apiRequest, clearSession, saveSession } from "./services/api.js";
import { roleBadge, statusBadge } from "./components/Badge.jsx";
import { SkeletonStats, SkeletonTable } from "./components/Spinner.jsx";
import { Notice } from "./components/Notice.jsx";
import { fmtDate, getGreeting } from "./utils/helpers.js";
import "../../CSS/styles.css";

/* ════════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════════ */

function Auth({ onLogin }) {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [studentNotice, setStudentNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setStudentNotice(false);
    setLoading(true);
    try {
      const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(loginForm) });
      
      // Strict rule: Students must use Mobile Application only!
      if (result.user.role === "student") {
        clearSession();
        setStudentNotice(true);
        setError("Student accounts must use the EthioPrep Mobile Application. Please open the EthioPrep app on your mobile phone to practice, study offline, take mock exams, and manage payments.");
        return;
      }

      saveSession(result);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-logo">
          <div className="logo-mark">E</div>
          <div>
            <div className="auth-logo-text">Ethio<span>Prep</span></div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>Staff &amp; Management Portal</div>
          </div>
        </div>

        <div style={{
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: "var(--r-md)",
          padding: "12px 14px",
          marginBottom: 20,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--text-2)"
        }}>
          <strong style={{ color: "var(--primary-light)", display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <ShieldCheckIcon size={15} /> Staff Access Only
          </strong>
          This portal is reserved for <strong>Administrators</strong>, <strong>Content Managers</strong>, and <strong>Cash Managers</strong>.
        </div>

        <h1>Staff Sign In</h1>
        <p className="subtitle">Sign in to manage curriculum, exams, materials, and finances.</p>

        {error && (
          <div className="auth-error" role="alert">
            {studentNotice ? <SmartphoneIcon size={18} className="auth-error-icon" /> : <CircleAlertIcon size={18} className="auth-error-icon" />}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submitLogin}>
          <div className="field">
            <label htmlFor="auth-email">Staff Email address</label>
            <div className="input-with-icon">
            <MailIcon size={16} className="input-icon" aria-hidden="true" />
            <input
              id="auth-email"
              autoComplete="email"
              type="email"
              required
              placeholder="admin@ethioprep.com"
              value={loginForm.email}
              onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
            />
            </div>
          </div>
          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <div className="input-with-icon">
            <LockIcon size={16} className="input-icon" aria-hidden="true" />
            <input
              id="auth-password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            <button
              type="button"
              className="input-action"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading
              ? <><Loader2Icon size={16} className="spin" /> Authenticating…</>
              : <><LogInIcon size={16} /> Sign In to Management Portal</>}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.5
        }}>
          <SmartphoneIcon size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} /><strong>Are you an entrance examination student?</strong><br />
          Students must use the <strong>EthioPrep Mobile Application</strong> to practice questions, study offline, take mock exams, and rank on the leaderboard.
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   OVERVIEW (Dashboard Home)
   ════════════════════════════════════════════════════════════════ */

function Overview({ user, stats }) {
  const items = [
    { label: "Subjects", value: stats.subjects, icon: <BookOpenIcon size={18} strokeWidth={2} />, cls: "icon-green" },
    { label: "Questions", value: stats.questions, icon: <CircleHelpIcon size={18} strokeWidth={2} />, cls: "icon-blue" },
    { label: "Exams Published", value: stats.exams, icon: <FileTextIcon size={18} strokeWidth={2} />, cls: "icon-purple" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: <CreditCardIcon size={18} strokeWidth={2} />, cls: "icon-amber" },
  ];

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Dashboard</span></div>
        <h1>Good {getGreeting()}, {user.displayName.split(" ")[0]}</h1>
        <p className="page-desc">Here's what's happening on EthioPrep right now.</p>
      </div>
      <div className="content-body">
        <div className="stats-grid">
          {items.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-header">
                <span className="stat-label">{s.label}</span>
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              </div>
              <div className="stat-value">{s.value ?? "—"}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Your Role & Permissions</span>
          </div>
          <div className="panel-body">
            <table>
              <thead><tr><th>Capability</th><th>Access</th></tr></thead>
              <tbody>
                {[
                  ["Manage Subjects & Chapters", ["admin", "content_manager"]],
                  ["Create & Publish Exams", ["admin", "content_manager"]],
                  ["Manage Question Bank", ["admin", "content_manager"]],
                  ["Verify Payments", ["admin", "cash_manager"]],
                  ["View Analytics", ["admin", "cash_manager", "content_manager"]],
                  ["Manage All Users", ["admin"]],
                ].map(([cap, roles]) => (
                  <tr key={cap}>
                    <td>{cap}</td>
                    <td>{roles.includes(user.role)
                      ? <span className="badge badge-green"><CheckIcon size={12} /> Allowed</span>
                      : <span className="badge badge-gray"><XIcon size={12} /> No Access</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUBJECTS PAGE
   ════════════════════════════════════════════════════════════════ */

function SubjectsPage({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", gradeLevel: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/question-bank/subjects");
      setSubjects(res.subjects);
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createSubject(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/question-bank/subjects", { method: "POST", body: JSON.stringify(form) });
      setMsg({ text: "Subject created successfully.", type: "success" });
      setShowModal(false);
      setForm({ name: "", code: "", description: "", gradeLevel: "" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
    finally { setSaving(false); }
  }

  async function deactivate(id) {
    if (!confirm("Deactivate this subject? All its chapters and questions will also be deactivated.")) return;
    try {
      await apiRequest(`/question-bank/subjects/${id}/deactivate`, { method: "PATCH" });
      setMsg({ text: "Subject deactivated.", type: "success" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  const canManage = ["admin", "content_manager"].includes(user.role);

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Content</span><span className="sep">›</span><span>Subjects</span></div>
        <div className="page-header-row">
          <div>
            <h1>Subjects</h1>
            <p className="page-desc">Manage exam subject categories for the question bank.</p>
          </div>
          {canManage && <button className="btn btn-primary" onClick={() => setShowModal(true)}><PlusIcon size={16} /> New Subject</button>}
        </div>
      </div>
      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">All Subjects ({subjects.length})</span>
          </div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Grade</th><th>Description</th><th>Status</th>{canManage && <th></th>}</tr>
                </thead>
                <tbody>
                  {subjects.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon"><BookOpenIcon size={26} strokeWidth={1.75} /></div><h3>No subjects yet</h3><p>Create your first subject to start building the question bank.</p></div></td></tr>
                  ) : subjects.map(s => (
                    <tr key={s._id}>
                      <td><strong>{s.name}</strong></td>
                      <td><span className="badge badge-blue">{s.code}</span></td>
                      <td className="td-muted">{s.gradeLevel || "—"}</td>
                      <td className="td-muted">{s.description || "—"}</td>
                      <td>{statusBadge(s.isActive ? "active" : "archived")}</td>
                      {canManage && <td><div className="td-actions">{s.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivate(s._id)}>Deactivate</button>}</div></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Subject</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <form onSubmit={createSubject}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-row">
                    <div className="field"><label>Subject Name *</label><input required placeholder="e.g. Mathematics" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="field"><label>Code *</label><input required placeholder="e.g. MATH" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                  </div>
                  <div className="field"><label>Grade Level</label><input placeholder="e.g. Grade 12" value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} /></div>
                  <div className="field"><label>Description</label><textarea placeholder="Brief description of this subject…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Subject"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   QUESTIONS PAGE
   ════════════════════════════════════════════════════════════════ */

function QuestionsPage({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subjectId: "", chapterId: "", prompt: "", correctAnswer: "",
    explanation: "", difficulty: "medium", questionType: "multiple_choice",
    options: ["", "", "", ""],
  });
  const [chapters, setChapters] = useState([]);
  const canManage = ["admin", "content_manager"].includes(user.role);

  useEffect(() => {
    apiRequest("/question-bank/subjects").then(r => setSubjects(r.subjects)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subjectId) {
      apiRequest(`/question-bank/subjects/${form.subjectId}/chapters`).then(r => setChapters(r.chapters)).catch(() => setChapters([]));
    } else { setChapters([]); }
  }, [form.subjectId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterSubject ? `?subjectId=${filterSubject}` : "";
      const res = await apiRequest(`/question-bank/questions${q}`);
      setQuestions(res.questions);
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  }, [filterSubject]);

  useEffect(() => { load(); }, [load]);

  async function createQuestion(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        options: form.questionType === "multiple_choice" ? form.options.filter(o => o.trim()) : [],
        chapterId: form.chapterId || undefined,
      };
      await apiRequest("/question-bank/questions", { method: "POST", body: JSON.stringify(payload) });
      setMsg({ text: "Question created.", type: "success" });
      setShowModal(false);
      setForm({ subjectId: "", chapterId: "", prompt: "", correctAnswer: "", explanation: "", difficulty: "medium", questionType: "multiple_choice", options: ["", "", "", ""] });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
    finally { setSaving(false); }
  }

  async function deactivate(id) {
    try {
      await apiRequest(`/question-bank/questions/${id}/deactivate`, { method: "PATCH" });
      setMsg({ text: "Question deactivated.", type: "success" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Content</span><span className="sep">›</span><span>Question Bank</span></div>
        <div className="page-header-row">
          <div><h1>Question Bank</h1><p className="page-desc">Create and manage questions for all subjects.</p></div>
          {canManage && <button className="btn btn-primary" onClick={() => setShowModal(true)}><PlusIcon size={16} /> New Question</button>}
        </div>
      </div>
      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Questions ({questions.length})</span>
            <div className="panel-actions">
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ width: 180 }}>
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Prompt</th><th>Type</th><th>Difficulty</th><th>Subject</th><th>Status</th>{canManage && <th></th>}</tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><CircleHelpIcon size={26} strokeWidth={1.75} /></div><h3>No questions found</h3><p>Add questions to start building exams.</p></div></td></tr>
                  ) : questions.map((q, i) => {
                    const subj = subjects.find(s => s._id === String(q.subjectId));
                    return (
                      <tr key={q._id}>
                        <td className="td-muted">{i + 1}</td>
                        <td style={{ maxWidth: 320 }}><span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.prompt}</span></td>
                        <td><span className="badge badge-blue">{q.questionType?.replace(/_/g, " ")}</span></td>
                        <td>{statusBadge(q.difficulty)}</td>
                        <td className="td-muted">{subj?.name || "—"}</td>
                        <td>{statusBadge(q.isActive ? "active" : "archived")}</td>
                        {canManage && <td><div className="td-actions">{q.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivate(q._id)}>Deactivate</button>}</div></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>New Question</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <form onSubmit={createQuestion}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-row">
                    <div className="field">
                      <label>Subject *</label>
                      <select required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value, chapterId: "" })}>
                        <option value="">Select subject</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Chapter</label>
                      <select value={form.chapterId} onChange={e => setForm({ ...form, chapterId: e.target.value })} disabled={!chapters.length}>
                        <option value="">No chapter</option>
                        {chapters.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label>Question Type</label>
                      <select value={form.questionType} onChange={e => setForm({ ...form, questionType: e.target.value })}>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="fill_blank">Fill in the Blank</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Difficulty</label>
                      <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div className="field"><label>Question Prompt *</label><textarea required rows={3} placeholder="Type the full question…" value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} /></div>

                  {form.questionType === "multiple_choice" && (
                    <>
                      <div style={{ display: "grid", gap: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Answer Options (A–D) *</label>
                        {["A", "B", "C", "D"].map((key, idx) => (
                          <div key={key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span className="badge badge-gray" style={{ width: 28, justifyContent: "center" }}>{key}</span>
                            <input placeholder={`Option ${key}`} value={form.options[idx]} onChange={e => { const opts = [...form.options]; opts[idx] = e.target.value; setForm({ ...form, options: opts }); }} />
                          </div>
                        ))}
                      </div>
                      <div className="field">
                        <label>Correct Answer Key * (A, B, C, or D)</label>
                        <select value={form.correctAnswer} onChange={e => setForm({ ...form, correctAnswer: e.target.value })} required>
                          <option value="">Select correct option</option>
                          {["A", "B", "C", "D"].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {form.questionType !== "multiple_choice" && (
                    <div className="field"><label>Correct Answer *</label><input required placeholder="Type the correct answer…" value={form.correctAnswer} onChange={e => setForm({ ...form, correctAnswer: e.target.value })} /></div>
                  )}

                  <div className="field"><label>Explanation (optional)</label><textarea rows={2} placeholder="Why is this the correct answer?" value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Question"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXAMS PAGE
   ════════════════════════════════════════════════════════════════ */

function ExamsPage({ user }) {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", subjectId: "", durationMinutes: 60,
    passingScore: 50, accessLevel: "free", questionIds: [],
  });
  const canManage = ["admin", "content_manager"].includes(user.role);

  useEffect(() => {
    apiRequest("/question-bank/subjects").then(r => setSubjects(r.subjects)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subjectId) {
      apiRequest(`/question-bank/questions?subjectId=${form.subjectId}`).then(r => setQuestions(r.questions)).catch(() => setQuestions([]));
    } else { setQuestions([]); }
  }, [form.subjectId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/exams");
      setExams(res.exams);
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createExam(e) {
    e.preventDefault();
    if (form.questionIds.length === 0) { setMsg({ text: "Select at least one question.", type: "error" }); return; }
    setSaving(true);
    try {
      await apiRequest("/exams", { method: "POST", body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes), passingScore: Number(form.passingScore) }) });
      setMsg({ text: "Exam created as draft.", type: "success" });
      setShowModal(false);
      setForm({ title: "", description: "", subjectId: "", durationMinutes: 60, passingScore: 50, accessLevel: "free", questionIds: [] });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
    finally { setSaving(false); }
  }

  async function publish(id) {
    try {
      await apiRequest(`/exams/${id}/publish`, { method: "PATCH" });
      setMsg({ text: "Exam published.", type: "success" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  async function archive(id) {
    try {
      await apiRequest(`/exams/${id}/archive`, { method: "PATCH" });
      setMsg({ text: "Exam archived.", type: "success" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  function toggleQuestion(id) {
    setForm(f => ({
      ...f, questionIds: f.questionIds.includes(id) ? f.questionIds.filter(q => q !== id) : [...f.questionIds, id],
    }));
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Content</span><span className="sep">›</span><span>Exams</span></div>
        <div className="page-header-row">
          <div><h1>Exams</h1><p className="page-desc">Create, publish, and archive practice exams for students.</p></div>
          {canManage && <button className="btn btn-primary" onClick={() => setShowModal(true)}><PlusIcon size={16} /> New Exam</button>}
        </div>
      </div>
      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />
        <div className="panel">
          <div className="panel-header"><span className="panel-title">All Exams ({exams.length})</span></div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Title</th><th>Duration</th><th>Questions</th><th>Pass Score</th><th>Access</th><th>Status</th>{canManage && <th>Actions</th>}</tr>
                </thead>
                <tbody>
                  {exams.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><FileTextIcon size={26} strokeWidth={1.75} /></div><h3>No exams yet</h3><p>Create your first exam to make it available to students.</p></div></td></tr>
                  ) : exams.map(ex => (
                    <tr key={ex._id}>
                      <td><strong>{ex.title}</strong><div className="td-muted" style={{ fontSize: 12, marginTop: 2 }}>{ex.description || ""}</div></td>
                      <td className="td-muted">{ex.durationMinutes} min</td>
                      <td className="td-muted">{ex.questionIds?.length || 0}</td>
                      <td className="td-muted">{ex.passingScore}%</td>
                      <td><span className={`badge ${ex.accessLevel === "premium" ? "badge-purple" : "badge-green"}`}>{ex.accessLevel}</span></td>
                      <td>{statusBadge(ex.status)}</td>
                      {canManage && (
                        <td><div className="td-actions">
                          {ex.status === "draft" && <button className="btn btn-sm btn-success" onClick={() => publish(ex._id)}>Publish</button>}
                          {ex.status === "published" && <button className="btn btn-sm btn-amber" onClick={() => archive(ex._id)}>Archive</button>}
                        </div></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>New Exam</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <form onSubmit={createExam}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field"><label>Exam Title *</label><input required placeholder="e.g. Grade 12 Mathematics Mock Exam" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="field"><label>Description</label><textarea placeholder="Brief overview of this exam…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="form-row">
                    <div className="field">
                      <label>Subject *</label>
                      <select required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value, questionIds: [] })}>
                        <option value="">Select subject</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Access Level</label>
                      <select value={form.accessLevel} onChange={e => setForm({ ...form, accessLevel: e.target.value })}>
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field"><label>Duration (minutes) *</label><input type="number" min="5" required value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} /></div>
                    <div className="field"><label>Passing Score (%) *</label><input type="number" min="1" max="100" required value={form.passingScore} onChange={e => setForm({ ...form, passingScore: e.target.value })} /></div>
                  </div>

                  {form.subjectId && (
                    <div className="field">
                      <label>Select Questions ({form.questionIds.length} selected) *</label>
                      <div style={{ maxHeight: 240, overflowY: "auto", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: 8, display: "grid", gap: 4 }}>
                        {questions.length === 0
                          ? <p style={{ color: "var(--text-3)", padding: 8, textAlign: "center" }}>No questions for this subject yet.</p>
                          : questions.map((q, i) => (
                            <label key={q._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: form.questionIds.includes(q._id) ? "var(--green-bg)" : "transparent" }}>
                              <input type="checkbox" checked={form.questionIds.includes(q._id)} onChange={() => toggleQuestion(q._id)} style={{ width: "auto", marginTop: 2 }} />
                              <span style={{ fontSize: 13 }}>{i + 1}. {q.prompt}</span>
                            </label>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Exam"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAYMENTS PAGE
   ════════════════════════════════════════════════════════════════ */

function PaymentsPage({ user }) {
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [verifying, setVerifying] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const canVerify = ["admin", "cash_manager"].includes(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([apiRequest("/payments"), apiRequest("/payments/dashboard")]);
      setPayments(pRes.payments);
      setDashboard(dRes);
    } catch (e) { setMsg({ text: e.message, type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function verify(id, status, reviewNote) {
    setVerifying(id + status);
    try {
      await apiRequest(`/payments/${id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNote })
      });
      setMsg({ text: `Payment ${status}.`, type: "success" });
      load();
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
    finally { setVerifying(null); }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Finance</span><span className="sep">›</span><span>Payments</span></div>
        <h1>Payment Management</h1>
        <p className="page-desc">Review, verify, and reject student subscription payments.</p>
      </div>
      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />

        {dashboard && (
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 24 }}>
            {[
              { label: "Pending Review", value: dashboard.pendingPayments || 0, icon: <HourglassIcon size={18} strokeWidth={2} />, cls: "icon-amber" },
              { label: "Approved Payments", value: dashboard.approvedPayments ?? dashboard.verifiedPayments ?? 0, icon: <CircleCheckIcon size={18} strokeWidth={2} />, cls: "icon-green" },
              { label: "Rejected Payments", value: dashboard.rejectedPayments || 0, icon: <CircleXIcon size={18} strokeWidth={2} />, cls: "icon-red" },
              { label: "Today's Revenue", value: `${dashboard.todayRevenue?.toLocaleString() || 0} ETB`, icon: <CalendarDaysIcon size={18} strokeWidth={2} />, cls: "icon-blue" },
              { label: "Monthly Revenue", value: `${dashboard.monthlyRevenue?.toLocaleString() || 0} ETB`, icon: <TrendingUpIcon size={18} strokeWidth={2} />, cls: "icon-purple" },
              { label: "Total Revenue", value: `${(dashboard.totalRevenue ?? dashboard.totalVerifiedAmount)?.toLocaleString() || 0} ETB`, icon: <WalletIcon size={18} strokeWidth={2} />, cls: "icon-green" },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-header"><span className="stat-label">{s.label}</span><div className={`stat-icon ${s.cls}`}>{s.icon}</div></div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="panel">
          <div className="panel-header"><span className="panel-title">All Payments ({payments.length})</span></div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Amount</th>
                    <th>Provider</th>
                    <th>Transaction Ref / Evidence</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    {canVerify && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><CreditCardIcon size={26} strokeWidth={1.75} /></div><h3>No payments yet</h3></div></td></tr>
                  ) : payments.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.fullName || "Student"}</strong></td>
                      <td><strong>{p.amount?.toLocaleString()} {p.currency || "ETB"}</strong></td>
                      <td><span className="badge badge-info">{p.provider?.toUpperCase()}</span></td>
                      <td className="td-muted" style={{ fontSize: 12 }}>
                        {p.transactionReference && (
                          <div style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                            {p.transactionReference}
                          </div>
                        )}
                        {p.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(p.receiptUrl)}
                            style={{
                              background: "rgba(0, 200, 150, 0.12)",
                              border: "1px solid rgba(0, 200, 150, 0.35)",
                              color: "#00c896",
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-block",
                              marginTop: 4
                            }}
                          >
                            <ImageIcon size={14} /> View Receipt
                          </button>
                        )}
                        {!p.transactionReference && !p.receiptUrl && "—"}
                      </td>
                      <td>{statusBadge(p.status)}</td>
                      <td className="td-muted">{fmtDate(p.submittedAt || p.createdAt)}</td>
                      {canVerify && (
                        <td><div className="td-actions">
                          {p.status === "pending" && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                disabled={verifying === p._id + "verified"}
                                onClick={() => verify(p._id, "verified")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                disabled={verifying === p._id + "rejected"}
                                onClick={() => {
                                  const reason = prompt("Select or enter rejection reason:\n1: Invalid Transaction Number\n2: Incorrect Amount\n3: Duplicate Payment\n4: Unclear Receipt", "Invalid Transaction Number");
                                  if (reason !== null) {
                                    verify(p._id, "rejected", reason);
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {p.status === "verified" && (
                            <button className="btn btn-sm btn-amber" disabled={verifying === p._id + "refunded"} onClick={() => verify(p._id, "refunded")}>Refund</button>
                          )}
                        </div></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 12, alignItems: "center" }}>
              <strong style={{ fontSize: 15, color: "var(--text)" }}><ReceiptIcon size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Receipt Evidence Screenshot</strong>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setPreviewImage(null)}
                style={{ fontSize: 13, cursor: "pointer" }}
              >
                <XIcon size={14} /> Close
              </button>
            </div>
            <img
              src={previewImage}
              alt="Receipt Evidence"
              style={{
                maxWidth: "100%",
                maxHeight: "75vh",
                borderRadius: 8,
                objectFit: "contain",
                border: "1px solid var(--border)"
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   STAFF NOTES PAGE  (Content Managers & Admins)
   ════════════════════════════════════════════════════════════════ */

function StaffNotesPage({ user }) {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subjectId: "",
    chapterId: "",
    fileType: "pdf",
    fileUrl: "",
    body: "",
    isPublic: true
  });

  const canManage = ["admin", "content_manager"].includes(user.role);

  useEffect(() => {
    apiRequest("/question-bank/subjects").then(r => setSubjects(r.subjects || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subjectId) {
      apiRequest(`/question-bank/subjects/${form.subjectId}/chapters`)
        .then(r => setChapters(r.chapters || []))
        .catch(() => setChapters([]));
    } else {
      setChapters([]);
    }
  }, [form.subjectId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = selectedSubject ? `?subjectId=${selectedSubject}` : "";
      const res = await apiRequest(`/notes${q}`);
      setNotes(res.notes || []);
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => { load(); }, [load]);

  async function createNote(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMsg({ text: "Educational study material created successfully.", type: "success" });
      setShowModal(false);
      setForm({ title: "", subjectId: "", chapterId: "", fileType: "pdf", fileUrl: "", body: "", isPublic: true });
      load();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id) {
    if (!confirm("Are you sure you want to remove this study note?")) return;
    try {
      await apiRequest(`/notes/${id}`, { method: "DELETE" });
      setMsg({ text: "Note deleted.", type: "success" });
      load();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Content</span><span className="sep">›</span><span>Study Notes</span></div>
        <div className="page-header-row">
          <div>
            <h1>Educational Study Notes</h1>
            <p className="page-desc">Upload PDFs, PowerPoint slides, Word documents, and syllabus summaries for students.</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <PlusIcon size={16} /> Upload / Create Note
            </button>
          )}
        </div>
      </div>

      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />

        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><span className="panel-title">Filter by Subject</span></div>
          <div className="panel-body">
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ maxWidth: 320 }}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Study Materials & Notes ({notes.length})</span>
          </div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Topic / Chapter</th>
                    <th>Format</th>
                    <th>File / Link</th>
                    <th>Access</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {notes.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state">No notes uploaded yet.</div></td></tr>
                  ) : notes.map(n => (
                    <tr key={n._id}>
                      <td><strong>{n.title}</strong></td>
                      <td><span className="badge badge-info">{n.subjectId?.name || "—"}</span></td>
                      <td className="td-muted">{n.chapterId?.title || "—"}</td>
                      <td>
                        <span className={`badge ${n.fileType === "pdf" ? "badge-red" : n.fileType?.includes("ppt") ? "badge-amber" : "badge-blue"}`}>
                          {(n.fileType || "pdf").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {n.fileUrl ? (
                          <a href={n.fileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "underline" }}>
                            <DownloadIcon size={14} /> View File
                          </a>
                        ) : (
                          <span className="td-muted">Text Note</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${n.isPublic ? "badge-green" : "badge-gray"}`}>
                          {n.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteNote(n._id)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Educational Note / Document</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><XIcon size={18} /></button>
            </div>
            <form onSubmit={createNote}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field">
                    <label>Title *</label>
                    <input required placeholder="e.g. Newton's 3 Laws Summary" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label>Subject *</label>
                      <select required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                        <option value="">— Select Subject —</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Topic / Chapter</label>
                      <select value={form.chapterId} onChange={e => setForm({ ...form, chapterId: e.target.value })}>
                        <option value="">— General / Optional —</option>
                        {chapters.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label>File Type *</label>
                      <select value={form.fileType} onChange={e => setForm({ ...form, fileType: e.target.value })}>
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="ppt">PowerPoint Presentation (.ppt, .pptx)</option>
                        <option value="docx">Word Document (.doc, .docx)</option>
                        <option value="text">Text Handout</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>File URL / Cloudinary Link</label>
                      <input placeholder="https://..." value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Overview / Key Concepts Summary</label>
                    <textarea rows={4} placeholder="Summary of formulas, rules, and concepts…" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Upload Note"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   USERS PAGE  (Admin Role Management)
   ════════════════════════════════════════════════════════════════ */

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiRequest(`/users${q}`);
      setUsers(res.users || []);
    } catch (e) {
      setMsg({ text: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function updateRole(userId, newRole) {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole })
      });
      setMsg({ text: "User role updated successfully.", type: "success" });
      load();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function toggleStatus(userId, currentStatus) {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await apiRequest(`/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setMsg({ text: `User marked as ${nextStatus}.`, type: "success" });
      load();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Admin</span><span className="sep">›</span><span>Users</span></div>
        <div className="page-header-row">
          <div>
            <h1>User Account Management</h1>
            <p className="page-desc">View registered students and staff, reassign roles, and manage access privileges.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }}
            />
          </div>
        </div>
      </div>

      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />

        <div className="panel">
          <div className="panel-header"><span className="panel-title">Registered Accounts ({users.length})</span></div>
          {loading ? <SkeletonTable /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Stream</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state">No users matching search.</div></td></tr>
                  ) : users.map(u => (
                    <tr key={u._id}>
                      <td><strong>{u.displayName}</strong></td>
                      <td className="td-muted">{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={e => updateRole(u._id, e.target.value)}
                          style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6 }}
                        >
                          <option value="student">Student</option>
                          <option value="content_manager">Content Manager</option>
                          <option value="cash_manager">Cash Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td>
                        <span className="badge badge-gray">{u.stream ? u.stream.toUpperCase() : "NATURAL"}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.isPremium ? "badge-green" : "badge-gray"}`}>
                          {u.isPremium ? <><CrownIcon size={12} /> Premium</> : "Free"}
                        </span>
                      </td>
                      <td>{statusBadge(u.status)}</td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.status === "active" ? "btn-secondary" : "btn-success"}`}
                          onClick={() => toggleStatus(u._id, u.status)}
                        >
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   ADMIN ANALYTICS PAGE
   ════════════════════════════════════════════════════════════════ */

function AnalyticsPage() {
  const [adminStats, setAdminStats] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest("/analytics/admin").catch(() => null),
      apiRequest("/analytics/summary").catch(() => ({ summary: [] }))
    ]).then(([adm, sum]) => {
      setAdminStats(adm);
      setSummary(sum?.summary || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Admin</span><span className="sep">›</span><span>Analytics</span></div>
        <h1>Platform System Analytics</h1>
        <p className="page-desc">Comprehensive system KPIs, user growth, revenue metrics, and activity logs.</p>
      </div>

      <div className="content-body">
        {loading ? <SkeletonStats count={6} /> : (
          <>
            {adminStats && (
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
                {[
                  { label: "Total Registered Users", value: adminStats.totalUsers, icon: <UsersIcon size={18} strokeWidth={2} />, cls: "icon-blue" },
                  { label: "Active Platform Users", value: adminStats.activeUsers, icon: <ZapIcon size={18} strokeWidth={2} />, cls: "icon-green" },
                  { label: "Premium Paid Users", value: adminStats.premiumUsers, icon: <CrownIcon size={18} strokeWidth={2} />, cls: "icon-amber" },
                  { label: "Questions in Bank", value: adminStats.totalQuestions, icon: <CircleHelpIcon size={18} strokeWidth={2} />, cls: "icon-purple" },
                  { label: "Published Mock Exams", value: adminStats.totalExams, icon: <FileTextIcon size={18} strokeWidth={2} />, cls: "icon-blue" },
                  { label: "Total Revenue Generated", value: `${adminStats.totalRevenue?.toLocaleString() || 0} ETB`, icon: <WalletIcon size={18} strokeWidth={2} />, cls: "icon-green" },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-header"><span className="stat-label">{s.label}</span><div className={`stat-icon ${s.cls}`}>{s.icon}</div></div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="panel">
              <div className="panel-header"><span className="panel-title">Recent Activity Trends</span></div>
              <div className="panel-body">
                {summary.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><BarChart3Icon size={26} strokeWidth={1.75} /></div>
                    <h3>Activity tracking active</h3>
                    <p>Usage metrics will aggregate here as students continue practicing offline and online.</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>Metric</th><th>Count</th></tr></thead>
                      <tbody>
                        {summary.map((row, i) => (
                          <tr key={i}>
                            <td className="td-muted">{fmtDate(row.date)}</td>
                            <td><span className="badge badge-blue">{row.metric}</span></td>
                            <td><strong>{row.count}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   CHAPTERS PAGE
   ════════════════════════════════════════════════════════════════ */

function ChaptersPage({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", order: 1 });
  const [saving, setSaving] = useState(false);
  const canManage = ["admin", "content_manager"].includes(user.role);

  useEffect(() => {
    apiRequest("/question-bank/subjects").then(r => setSubjects(r.subjects)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) { setChapters([]); return; }
    setLoading(true);
    apiRequest(`/question-bank/subjects/${selectedSubject}/chapters`)
      .then(r => setChapters(r.chapters))
      .catch(e => setMsg({ text: e.message, type: "error" }))
      .finally(() => setLoading(false));
  }, [selectedSubject]);

  async function createChapter(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/question-bank/subjects/${selectedSubject}/chapters`, { method: "POST", body: JSON.stringify(form) });
      setMsg({ text: "Chapter created.", type: "success" });
      setShowModal(false);
      setForm({ title: "", description: "", order: 1 });
      const r = await apiRequest(`/question-bank/subjects/${selectedSubject}/chapters`);
      setChapters(r.chapters);
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
    finally { setSaving(false); }
  }

  async function deactivate(id) {
    try {
      await apiRequest(`/question-bank/chapters/${id}/deactivate`, { method: "PATCH" });
      setMsg({ text: "Chapter deactivated.", type: "success" });
      const r = await apiRequest(`/question-bank/subjects/${selectedSubject}/chapters`);
      setChapters(r.chapters);
    } catch (err) { setMsg({ text: err.message, type: "error" }); }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Content</span><span className="sep">›</span><span>Chapters</span></div>
        <div className="page-header-row">
          <div><h1>Chapters</h1><p className="page-desc">Organise subjects into chapters for structured learning.</p></div>
          {canManage && selectedSubject && <button className="btn btn-primary" onClick={() => setShowModal(true)}><PlusIcon size={16} /> New Chapter</button>}
        </div>
      </div>
      <div className="content-body">
        <Notice text={msg.text} type={msg.type} onClose={() => setMsg({ text: "" })} />
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><span className="panel-title">Select Subject</span></div>
          <div className="panel-body">
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ maxWidth: 320 }}>
              <option value="">— Choose a subject —</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {selectedSubject && (
          <div className="panel">
            <div className="panel-header"><span className="panel-title">Chapters ({chapters.length})</span></div>
            {loading ? <SkeletonTable /> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order</th><th>Title</th><th>Description</th><th>Status</th>{canManage && <th></th>}</tr></thead>
                  <tbody>
                    {chapters.length === 0 ? (
                      <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon"><FolderOpenIcon size={26} strokeWidth={1.75} /></div><h3>No chapters yet</h3></div></td></tr>
                    ) : chapters.map(c => (
                      <tr key={c._id}>
                        <td className="td-muted">{c.order}</td>
                        <td><strong>{c.title}</strong></td>
                        <td className="td-muted">{c.description || "—"}</td>
                        <td>{statusBadge(c.isActive ? "active" : "archived")}</td>
                        {canManage && <td><div className="td-actions">{c.isActive && <button className="btn btn-sm btn-danger" onClick={() => deactivate(c._id)}>Deactivate</button>}</div></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>New Chapter</h2><button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><XIcon size={18} /></button></div>
            <form onSubmit={createChapter}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field"><label>Chapter Title *</label><input required placeholder="e.g. Algebra Fundamentals" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="field"><label>Order</label><input type="number" min="1" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} /></div>
                  <div className="field"><label>Description</label><textarea placeholder="Brief description…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Chapter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD SHELL — SIDEBAR + ROUTING
   ════════════════════════════════════════════════════════════════ */

function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = e => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);
  const [stats, setStats] = useState({ subjects: 0, questions: 0, exams: 0, pendingPayments: 0 });

  useEffect(() => {
    // Load overview stats in background
    Promise.all([
      apiRequest("/question-bank/subjects").then(r => r.subjects.length).catch(() => 0),
      apiRequest("/question-bank/questions").then(r => r.questions.length).catch(() => 0),
      apiRequest("/exams").then(r => r.exams.length).catch(() => 0),
      apiRequest("/payments/dashboard").then(r => r.pendingPayments).catch(() => 0),
    ]).then(([subjects, questions, exams, pendingPayments]) => {
      setStats({ subjects, questions, exams, pendingPayments });
    });
  }, []);

  const canContent = ["admin", "content_manager"].includes(user.role);
  const canFinance = ["admin", "cash_manager"].includes(user.role);
  const isAdmin = user.role === "admin";

  const nav = [
    { id: "overview", label: "Overview", icon: <LayoutDashboardIcon size={18} strokeWidth={2} /> },
    ...(canContent ? [
      { section: "Content Management" },
      { id: "subjects",  label: "Subjects",      icon: <BookOpenIcon size={18} strokeWidth={2} /> },
      { id: "chapters",  label: "Chapters",       icon: <FolderOpenIcon size={18} strokeWidth={2} /> },
      { id: "questions", label: "Question Bank",  icon: <CircleHelpIcon size={18} strokeWidth={2} /> },
      { id: "exams",     label: "Exams",          icon: <FileTextIcon size={18} strokeWidth={2} /> },
      { id: "notes",     label: "Study Notes",    icon: <BookMarkedIcon size={18} strokeWidth={2} /> },
    ] : []),
    ...(canFinance ? [
      { section: "Finance" },
      { id: "payments",  label: "Payments",       icon: <CreditCardIcon size={18} strokeWidth={2} /> },
    ] : []),
    ...(isAdmin ? [
      { section: "Administration" },
      { id: "users",     label: "Users",          icon: <UsersIcon size={18} strokeWidth={2} /> },
      { id: "analytics", label: "Analytics",      icon: <BarChart3Icon size={18} strokeWidth={2} /> },
    ] : []),
  ];

  function renderPage() {
    switch (page) {
      case "overview":  return <Overview user={user} stats={stats} />;
      case "subjects":  return <SubjectsPage user={user} />;
      case "chapters":  return <ChaptersPage user={user} />;
      case "questions": return <QuestionsPage user={user} />;
      case "exams":     return <ExamsPage user={user} />;
      case "notes":     return <StaffNotesPage user={user} />;
      case "payments":  return <PaymentsPage user={user} />;
      case "users":     return <UsersPage />;
      case "analytics": return <AnalyticsPage />;
      default:          return <Overview user={user} stats={stats} />;
    }
  }

  return (
    <div className="app-shell">
      {/* ── Mobile top bar ── */}
      <header className="mobile-topbar">
        <button className="icon-btn" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
          <MenuIcon size={20} />
        </button>
        <div className="mobile-brand">
          <div className="sidebar-logo">E</div>
          <span>Ethio<b>Prep</b></span>
        </div>
        <div className="user-avatar" title={user.displayName}>{user.displayName[0].toUpperCase()}</div>
      </header>
      <div className={`drawer-backdrop ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${navOpen ? "open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">E</div>
          <div>
            <div className="sidebar-title">EthioPrep</div>
            <div className="sidebar-subtitle">Staff Portal</div>
          </div>
          <button className="icon-btn drawer-close" aria-label="Close navigation" onClick={() => setNavOpen(false)}>
            <XIcon size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if (item.section) return <div key={i} className="nav-section-label">{item.section}</div>;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                aria-current={page === item.id ? "page" : undefined}
                title={item.label}
                onClick={() => { setPage(item.id); setNavOpen(false); }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user.displayName[0].toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.displayName}</div>
              <div className="user-role">{ROLE_LABELS[user.role] || user.role}</div>
            </div>
            <button className="signout-btn" title="Sign out" aria-label="Sign out" onClick={() => { clearSession(); onLogout(); }}><LogOutIcon size={16} /></button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   APP ROOT
   ════════════════════════════════════════════════════════════════ */

function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("ethioprep_user") || "null");
      // If a student was previously saved in localStorage, clear it so they see the staff portal notice
      if (u && u.role === "student") {
        localStorage.removeItem("ethioprep_token");
        localStorage.removeItem("ethioprep_user");
        return null;
      }
      return u;
    } catch {
      return null;
    }
  });

  if (!user || user.role === "student") {
    return <Auth onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

createRoot(document.getElementById("root")).render(<App />);
