import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Input } from "../components/Input.js";
import { Notice } from "../components/Notice.js";
import { Icon } from "../components/Icon.js";
import { EmptyState } from "../components/EmptyState.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function NotesScreen({ notes = [], onSaveNote, saving, user }) {
  const [activeTab, setActiveTab] = useState("materials"); // "materials" | "personal"
  const [showForm, setShowForm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const userStream = user?.stream || "natural";
  const isNatural = userStream === "natural";

  const materials = notes.filter((n) => {
    if (!n.isPublic && !n.uploadedBy) return false;
    const subjStream = n.subjectId?.stream;
    const subjCode = n.subjectId?.code;
    if (isNatural) {
      if (subjStream) return subjStream === "natural" || subjStream === "both";
      if (subjCode) return ["MATH_NAT", "PHYS", "CHEM", "BIO", "ENG", "APTITUDE", "SAT"].includes(subjCode);
      const titleLower = (n.title || "").toLowerCase();
      if (titleLower.includes("social") || titleLower.includes("history") || titleLower.includes("geography") || titleLower.includes("economics")) {
        return false;
      }
      return true;
    } else {
      if (subjStream) return subjStream === "social" || subjStream === "both";
      if (subjCode) return ["MATH_SOC", "HIST", "GEOG", "ECON", "ENG", "APTITUDE", "SAT"].includes(subjCode);
      const titleLower = (n.title || "").toLowerCase();
      if (titleLower.includes("natural") || titleLower.includes("physics") || titleLower.includes("chemistry") || titleLower.includes("biology")) {
        return false;
      }
      return true;
    }
  });
  const personal = notes.filter((n) => !n.isPublic && n.userId === (user?._id || user?.id));

  async function handleSave() {
    setError("");
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required for your study note.");
      return;
    }

    try {
      await onSaveNote({ title: title.trim(), body: body.trim(), isPublic: false });
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Failed to save note.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Study Resources</Text>
          <Text style={styles.subtitle}>
            Teacher handouts, slide decks, and your personal revision notebook.
          </Text>
        </View>
        {activeTab === "personal" && (
          <Button
            onPress={() => setShowForm(!showForm)}
            size="sm"
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? "Cancel" : "+ New Note"}
          </Button>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          onPress={() => setActiveTab("materials")}
          style={[styles.tabBtn, activeTab === "materials" && styles.activeTabBtn]}
        >
          <Text style={[styles.tabBtnText, activeTab === "materials" && styles.activeTabBtnText]}>
            <Icon color={activeTab === "materials" ? COLORS.onPrimary : COLORS.textMuted} name="book-outline" size={14} />{" "}
            Official Materials ({materials.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("personal")}
          style={[styles.tabBtn, activeTab === "personal" && styles.activeTabBtn]}
        >
          <Text style={[styles.tabBtnText, activeTab === "personal" && styles.activeTabBtnText]}>
            <Icon color={activeTab === "personal" ? COLORS.onPrimary : COLORS.textMuted} name="create-outline" size={14} />{" "}
            My Notebook ({personal.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "materials" ? (
        materials.length === 0 ? (
          <EmptyState
            icon="document-attach-outline"
            message="Teachers are uploading PDF and presentation handouts."
            title="No official materials yet"
          />
        ) : (
          materials.map((m) => {
            const fileType = (m.fileType || "pdf").toUpperCase();
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                key={m._id || m.localId}
                onPress={() => setSelectedMaterial(m)}
              >
                <Card style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.badgeRow}>
                      <View style={styles.formatBadge}>
                        <Text style={styles.formatBadgeText}>{fileType}</Text>
                      </View>
                      <Text style={styles.subjectText}>{m.subjectId?.name || "General"}</Text>
                      {m.chapterId?.title ? (
                        <Text style={styles.chapterBadgeText}>• {m.chapterId.title}</Text>
                      ) : null}
                    </View>
                    <Icon color={COLORS.primary} name="chevron-forward" size={16} />
                  </View>
                  <Text style={styles.noteTitle}>{m.title}</Text>
                  {m.body ? (
                    <Text numberOfLines={3} style={styles.noteBody}>
                      {m.body}
                    </Text>
                  ) : null}
                  <View style={styles.protectedRow}>
                    <Icon color={COLORS.primaryDark} name="shield-checkmark-outline" size={13} />
                    <Text style={styles.protectedText}>
                      Protected In-App Content · Tap to Read Offline
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )
      ) : (
        <>
          {showForm && (
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>Add Personal Note</Text>
              <Notice message={error} type="error" />
              <Input
                label="Note Title"
                onChangeText={setTitle}
                placeholder="e.g. Physics Formula Sheet"
                value={title}
              />
              <Input
                label="Note Content"
                multiline
                numberOfLines={4}
                onChangeText={setBody}
                placeholder="Write key formulas, concepts, or reminders..."
                value={body}
              />
              <Button loading={saving} onPress={handleSave}>
                Save to Notebook
              </Button>
            </Card>
          )}

          {personal.length === 0 ? (
            <EmptyState
              icon="create-outline"
              message={'Tap "+ New Note" to write down important formulas and exam summaries.'}
              title="Your notebook is empty"
            />
          ) : (
            personal.map((note) => (
              <Card key={note._id || note.localId} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.dateText}>
                    {note.updatedAt
                      ? new Date(note.updatedAt).toLocaleDateString("en-ET", {
                          month: "short",
                          day: "numeric"
                        })
                      : "Saved"}
                  </Text>
                </View>
                <Text style={styles.noteBody}>{note.body}</Text>
              </Card>
            ))
          )}
        </>
      )}
      {/* ── Protected Offline In-App Reader Modal ── */}
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedMaterial(null)}
        visible={Boolean(selectedMaterial)}
      >
        <SafeAreaView style={styles.readerContainer}>
          {/* Reader Top Bar */}
          <View style={styles.readerHeader}>
            <TouchableOpacity
              onPress={() => setSelectedMaterial(null)}
              style={styles.readerBackBtn}
            >
              <Icon color={COLORS.primary} name="arrow-back" size={20} />
              <Text style={styles.readerBackText}>Close</Text>
            </TouchableOpacity>
            <View style={styles.offlineProtectedBadge}>
              <Icon color={COLORS.onPrimary} name="lock-closed" size={11} />
              <Text style={styles.offlineProtectedBadgeText}>Protected Offline Reader</Text>
            </View>
          </View>

          {selectedMaterial ? (
            <ScrollView
              contentContainerStyle={styles.readerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.badgeRow}>
                <View style={styles.formatBadge}>
                  <Text style={styles.formatBadgeText}>
                    {(selectedMaterial.fileType || "pdf").toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.subjectText}>
                  {selectedMaterial.subjectId?.name || "General Subject"}
                </Text>
                {selectedMaterial.chapterId?.title ? (
                  <Text style={styles.chapterBadgeText}>
                    • {selectedMaterial.chapterId.title}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.readerTitle}>{selectedMaterial.title}</Text>

              {/* Security Banner */}
              <View style={styles.securityBanner}>
                <Icon color={COLORS.primary} name="shield-outline" size={16} />
                <Text style={styles.securityBannerText}>
                  Available offline inside EthioPrep. External downloading, file export, and sharing are restricted to protect educational materials.
                </Text>
              </View>

              {/* Full Text Content Body */}
              <View style={styles.readerBodyContainer}>
                <Text style={styles.readerBodyText}>
                  {selectedMaterial.body || "No text summary provided for this material."}
                </Text>
              </View>

              {selectedMaterial.uploadedBy?.displayName ? (
                <Text style={styles.readerAuthor}>
                  Published by: {selectedMaterial.uploadedBy.displayName}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  tabSelector: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center"
  },
  activeTabBtn: {
    backgroundColor: COLORS.primary
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  activeTabBtnText: {
    color: COLORS.onPrimary
  },
  formCard: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceMuted
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: SPACING.md
  },
  noteCard: {
    marginBottom: SPACING.sm
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  formatBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.onPrimary
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted
  },
  chapterBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  noteBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20
  },
  protectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  protectedText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primaryDark
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: SPACING.lg,
    lineHeight: 20
  },

  /* ── Reader Modal Styles ── */
  readerContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  readerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface
  },
  readerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  readerBackText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary
  },
  offlineProtectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full
  },
  offlineProtectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.onPrimary
  },
  readerContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl || 40
  },
  readerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 28,
    marginVertical: SPACING.sm
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primaryLight || COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.md
  },
  securityBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.primaryDark,
    lineHeight: 16,
    fontWeight: "600"
  },
  readerBodyContainer: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm
  },
  readerBodyText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24
  },
  readerAuthor: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: SPACING.md,
    textAlign: "right"
  }
});
