import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Input } from "../components/Input.js";
import { Notice } from "../components/Notice.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function NotesScreen({ notes = [], onSaveNote, saving, user }) {
  const [activeTab, setActiveTab] = useState("materials"); // "materials" | "personal"
  const [showForm, setShowForm] = useState(false);
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
            📖 Official Materials ({materials.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("personal")}
          style={[styles.tabBtn, activeTab === "personal" && styles.activeTabBtn]}
        >
          <Text style={[styles.tabBtnText, activeTab === "personal" && styles.activeTabBtnText]}>
            📝 My Notebook ({personal.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "materials" ? (
        materials.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No official study materials uploaded yet. Teachers are uploading PDF and presentation handouts.
            </Text>
          </Card>
        ) : (
          materials.map((m) => {
            const fileType = (m.fileType || "pdf").toUpperCase();
            return (
              <Card key={m._id || m.localId} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.formatBadge}>
                      <Text style={styles.formatBadgeText}>{fileType}</Text>
                    </View>
                    <Text style={styles.subjectText}>{m.subjectId?.name || "General"}</Text>
                  </View>
                </View>
                <Text style={styles.noteTitle}>{m.title}</Text>
                {m.body ? <Text style={styles.noteBody}>{m.body}</Text> : null}
                {m.fileUrl ? (
                  <View style={styles.downloadRow}>
                    <Text style={styles.downloadLinkText}>📥 Available for offline study ({fileType})</Text>
                  </View>
                ) : null}
              </Card>
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
            <Card>
              <Text style={styles.emptyText}>
                Your notebook is empty. Tap "+ New Note" to write down important formulas and exam summaries.
              </Text>
            </Card>
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
    color: COLORS.textLight
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
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted
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
  downloadRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  downloadLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: SPACING.lg,
    lineHeight: 20
  }
});
