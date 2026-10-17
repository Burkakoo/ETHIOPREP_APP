import React from "react";
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        size === "sm" && styles.sm,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? COLORS.text : COLORS.surface} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            isSecondary && styles.secondaryText,
            isOutline && styles.outlineText,
            size === "sm" && styles.smText
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  primary: {
    backgroundColor: COLORS.accent
  },
  secondary: {
    backgroundColor: COLORS.primary
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  disabled: {
    opacity: 0.6
  },
  text: {
    fontWeight: "700",
    fontSize: 15
  },
  primaryText: {
    color: COLORS.text
  },
  secondaryText: {
    color: COLORS.textLight
  },
  outlineText: {
    color: COLORS.primary
  },
  smText: {
    fontSize: 13
  }
});
