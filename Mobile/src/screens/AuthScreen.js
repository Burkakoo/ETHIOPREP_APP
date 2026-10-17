import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Notice } from "../components/Notice.js";
import { login, register } from "../services/api.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export function AuthScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [stream, setStream] = useState("natural"); // 'natural' | 'social'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    if (isRegister && !displayName) {
      setError("Please provide your full name.");
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isRegister) {
        result = await register({ email, password, displayName, phoneNumber, stream });
      } else {
        result = await login(email, password);
      }
      onLoginSuccess(result.user);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>EthioPrep</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Create your preparation account" : "Sign in to continue your preparation"}
        </Text>

        <Notice message={error} type="error" />

        {isRegister && (
          <>
            <Input
              label="Full Name"
              onChangeText={setDisplayName}
              placeholder="e.g. Abebe Bikila"
              value={displayName}
            />

            <Text style={styles.streamLabel}>Choose Your Stream</Text>
            <View style={styles.streamPickerRow}>
              <TouchableOpacity
                onPress={() => setStream("natural")}
                style={[
                  styles.streamOption,
                  stream === "natural" && styles.streamOptionActive
                ]}
              >
                <Text
                  style={[
                    styles.streamOptionText,
                    stream === "natural" && styles.streamOptionTextActive
                  ]}
                >
                  🔬 Natural Science
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStream("social")}
                style={[
                  styles.streamOption,
                  stream === "social" && styles.streamOptionActive
                ]}
              >
                <Text
                  style={[
                    styles.streamOptionText,
                    stream === "social" && styles.streamOptionTextActive
                  ]}
                >
                  📚 Social Science
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              keyboardType="phone-pad"
              label="Phone Number (Optional)"
              onChangeText={setPhoneNumber}
              placeholder="0911000000"
              value={phoneNumber}
            />
          </>
        )}

        <Input
          keyboardType="email-address"
          label="Email Address"
          onChangeText={setEmail}
          placeholder="student@example.com"
          value={email}
        />

        <Input
          label="Password"
          onChangeText={setPassword}
          placeholder="Min 8 characters"
          secureTextEntry
          value={password}
        />

        <Button loading={loading} onPress={handleSubmit} style={styles.submitBtn}>
          {isRegister ? "Create Account" : "Sign In"}
        </Button>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          style={styles.switchBtn}
        >
          <Text style={styles.switchText}>
            {isRegister
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.primary
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    elevation: 4
  },
  brand: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg
  },
  submitBtn: {
    marginTop: SPACING.sm
  },
  switchBtn: {
    marginTop: SPACING.lg,
    alignItems: "center"
  },
  switchText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13
  },
  streamLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs
  },
  streamPickerRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md
  },
  streamOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center"
  },
  streamOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#f0fdf4"
  },
  streamOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  streamOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "900"
  }
});
