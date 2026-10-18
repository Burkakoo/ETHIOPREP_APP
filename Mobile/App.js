import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Header } from "./src/components/Header.js";
import { Icon } from "./src/components/Icon.js";
import { Notice } from "./src/components/Notice.js";
import { AuthScreen } from "./src/screens/AuthScreen.js";
import { HomeScreen } from "./src/screens/HomeScreen.js";
import { ExamsScreen } from "./src/screens/ExamsScreen.js";
import { ExamActiveScreen } from "./src/screens/ExamActiveScreen.js";
import { NotesScreen } from "./src/screens/NotesScreen.js";
import { ProgressScreen } from "./src/screens/ProgressScreen.js";
import { PaymentScreen } from "./src/screens/PaymentScreen.js";
import { ProfileScreen } from "./src/screens/ProfileScreen.js";
import {
  request,
  requestWithOfflineQueue
} from "./src/services/api.js";
import { getQueue } from "./src/services/offlineQueue.js";
import { COLORS, RADIUS, SPACING } from "./src/utils/theme.js";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "exams", label: "Exams", icon: "document-text" },
  { id: "notes", label: "Notes", icon: "book" },
  { id: "progress", label: "Progress", icon: "stats-chart" },
  { id: "payments", label: "Pay", icon: "card" },
  { id: "profile", label: "Profile", icon: "person" }
];

function generateId() {
  return "m_" + Math.random().toString(36).substring(2, 10);
}

function MainDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("home");
  const [notice, setNotice] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(user);

  // App domain state
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [notes, setNotes] = useState([]);
  const [progress, setProgress] = useState([]);
  const [payments, setPayments] = useState([]);

  // Active exam session
  const [activeExamSession, setActiveExamSession] = useState(null);
  const [loadingExamId, setLoadingExamId] = useState(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadDashboardData();
    refreshQueue();
  }, []);

  async function refreshQueue() {
    try {
      const q = await getQueue();
      setQueueCount(q.length);
    } catch {
      // ignore
    }
  }

  async function loadDashboardData() {
    try {
      const [subjRes, examsRes, notesRes, progRes, payRes] = await Promise.allSettled([
        request("/question-bank/subjects"),
        request("/exams"),
        request("/notes"),
        request("/progress"),
        request("/payments")
      ]);

      if (subjRes.status === "fulfilled") setSubjects(subjRes.value.subjects || []);
      if (examsRes.status === "fulfilled") setExams(examsRes.value.exams || []);
      if (notesRes.status === "fulfilled") setNotes(notesRes.value.notes || []);
      if (progRes.status === "fulfilled") setProgress(progRes.value.progress || []);
      if (payRes.status === "fulfilled") setPayments(payRes.value.payments || []);
    } catch (error) {
      setNotice({ type: "error", message: "Failed to sync remote data. Offline cache active." });
    }
  }

  async function handleStartExam(examItem) {
    setLoadingExamId(examItem._id);
    setNotice(null);
    try {
      const examData = await request(`/exams/${examItem._id}/start`);
      setActiveExamSession(examData);
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to start exam session." });
    } finally {
      setLoadingExamId(null);
    }
  }

  async function handleSubmitExam(attemptId, answers) {
    setSubmittingExam(true);
    setNotice(null);
    try {
      const result = await request(`/exams/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers })
      });
      setNotice({
        type: "success",
        message: `Exam submitted! Score: ${result.attempt.percentage}%`
      });
      loadDashboardData();
      return result;
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to submit exam." });
      throw error;
    } finally {
      setSubmittingExam(false);
    }
  }

  async function handleSaveNote(notePayload) {
    setSavingNote(true);
    setNotice(null);
    const localId = generateId();
    try {
      const result = await requestWithOfflineQueue(
        "/notes",
        {
          method: "POST",
          body: JSON.stringify({ ...notePayload, localId })
        },
        { operation: "create", entity: "note", entityId: localId, payload: notePayload }
      );

      setNotice({
        type: "success",
        message: result.online ? "Note saved to server." : "Offline: Note queued for sync."
      });

      refreshQueue();
      if (result.online) loadDashboardData();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to save note." });
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveProgress(progressPayload) {
    setSavingProgress(true);
    setNotice(null);
    const localId = generateId();
    try {
      const result = await requestWithOfflineQueue(
        "/progress",
        {
          method: "POST",
          body: JSON.stringify({ ...progressPayload, localUpdatedAt: new Date().toISOString() })
        },
        { operation: "upsert", entity: "progress", entityId: localId, payload: progressPayload }
      );

      setNotice({
        type: "success",
        message: result.online ? "Progress recorded." : "Offline: Progress queued for sync."
      });

      refreshQueue();
      if (result.online) loadDashboardData();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to log progress." });
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleSubmitPayment(paymentPayload) {
    setSubmittingPayment(true);
    setNotice(null);
    const clientMutationId = generateId();
    try {
      const result = await requestWithOfflineQueue(
        "/payments",
        {
          method: "POST",
          body: JSON.stringify({ ...paymentPayload, clientMutationId })
        },
        { operation: "create", entity: "payment", entityId: clientMutationId, payload: paymentPayload }
      );

      setNotice({
        type: "success",
        message: result.online
          ? "Payment submitted for review."
          : "Offline: Payment queued for verification."
      });

      refreshQueue();
      if (result.online) loadDashboardData();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Failed to submit payment." });
    } finally {
      setSubmittingPayment(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Header
          onLogout={onLogout}
          onNavigateProfile={() => setTab("profile")}
          queueCount={queueCount}
          user={currentUser}
        />

        <Notice message={notice?.message} type={notice?.type} />

        {activeExamSession ? (
          <ExamActiveScreen
            examData={activeExamSession}
            onExit={() => setActiveExamSession(null)}
            onSubmit={handleSubmitExam}
            submitting={submittingExam}
          />
        ) : (
          <>
            <View style={styles.tabBar}>
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <TouchableOpacity
                    accessibilityLabel={t.label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    style={[styles.tabItem, active && styles.activeTabItem]}
                  >
                    <Icon
                      color={active ? COLORS.onPrimary : COLORS.textMuted}
                      name={active ? t.icon : `${t.icon}-outline`}
                      size={18}
                    />
                    <Text style={[styles.tabText, active && styles.activeTabText]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tab === "home" && (
              <HomeScreen
                onNavigateTab={setTab}
                onSelectSubject={(subject) => {
                  const subjectExam = exams.find(
                    (e) => String(e.subjectId?._id || e.subjectId) === String(subject._id)
                  );
                  if (subjectExam) {
                    handleStartExam(subjectExam);
                  } else {
                    setTab("exams");
                  }
                }}
                subjects={subjects}
                user={currentUser}
              />
            )}

            {tab === "exams" && (
              <ExamsScreen
                exams={exams}
                loadingExamId={loadingExamId}
                onStartExam={handleStartExam}
                user={currentUser}
              />
            )}

            {tab === "notes" && (
              <NotesScreen
                notes={notes}
                onSaveNote={handleSaveNote}
                saving={savingNote}
                user={currentUser}
              />
            )}

            {tab === "progress" && (
              <ProgressScreen
                onSaveProgress={handleSaveProgress}
                progress={progress}
                saving={savingProgress}
              />
            )}

            {tab === "payments" && (
              <PaymentScreen
                onSubmitPayment={handleSubmitPayment}
                payments={payments}
                submitting={submittingPayment}
                user={currentUser}
              />
            )}

            {tab === "profile" && (
              <ProfileScreen
                onUpdateUser={setCurrentUser}
                user={currentUser}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("ethioprep_user")
      .then((val) => {
        if (val) setUser(JSON.parse(val));
      })
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    AsyncStorage.multiRemove(["ethioprep_token", "ethioprep_user"]).then(() => {
      setUser(null);
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>E</Text>
        </View>
        <Text style={styles.loadingBrand}>
          Ethio<Text style={{ color: COLORS.primary }}>Prep</Text>
        </Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
      </View>
    );
  }

  return user ? (
    <MainDashboard onLogout={handleLogout} user={user} />
  ) : (
    <AuthScreen onLoginSuccess={setUser} />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  container: {
    padding: SPACING.lg
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabItem: {
    flex: 1,
    minHeight: 52,
    paddingVertical: SPACING.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: RADIUS.sm
  },
  activeTabItem: {
    backgroundColor: COLORS.primary
  },
  tabText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  activeTabText: {
    color: COLORS.onPrimary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background
  },
  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md
  },
  loadingLogoText: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.onPrimary
  },
  loadingBrand: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: COLORS.text
  }
});
