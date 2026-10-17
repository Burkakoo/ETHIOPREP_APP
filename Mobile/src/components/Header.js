import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function Header({ user, onLogout, onNavigateProfile, queueCount = 0 }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity activeOpacity={0.7} onPress={onNavigateProfile} style={styles.userInfo}>
        <Text style={styles.brand}>EthioPrep</Text>
        <Text style={styles.userRole}>
          {user?.displayName || "Student"} - {user?.role || "student"}
        </Text>
      </TouchableOpacity>
      <View style={styles.actions}>
        {queueCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queueCount} sync</Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.7} onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  userInfo: {
    flex: 1
  },
  brand: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 0.3
  },
  userRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm
  },
  badge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warning
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.warning
  },
  logoutBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 13
  }
});
