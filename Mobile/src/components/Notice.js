import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function Notice({ type = "info", message }) {
  if (!message) return null;

  const isSuccess = type === "success";
  const isError = type === "error";
  const isWarning = type === "warning";

  return (
    <View
      style={[
        styles.container,
        isSuccess && styles.success,
        isError && styles.error,
        isWarning && styles.warning
      ]}
    >
      <Text
        style={[
          styles.text,
          isSuccess && styles.successText,
          isError && styles.errorText,
          isWarning && styles.warningText
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.infoBg,
    borderWidth: 1,
    borderColor: COLORS.info
  },
  success: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success
  },
  error: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger
  },
  warning: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.info
  },
  successText: {
    color: COLORS.success
  },
  errorText: {
    color: COLORS.danger
  },
  warningText: {
    color: COLORS.warning
  }
});
