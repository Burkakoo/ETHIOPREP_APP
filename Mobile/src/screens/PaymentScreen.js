import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Input } from "../components/Input.js";
import { Notice } from "../components/Notice.js";
import { Icon } from "../components/Icon.js";
import { EmptyState } from "../components/EmptyState.js";
import { COLORS, RADIUS, SPACING } from "../utils/theme.js";

export const PAYMENT_METHODS = [
  {
    id: "telebirr",
    name: "Telebirr",
    accountNumber: "0915200879",
    accountName: "Burka Muhammed",
    category: "Mobile Wallet",
    themeColor: "#008542"
  },
  {
    id: "cbe_birr",
    name: "CBE Birr",
    accountNumber: "0915200879",
    accountName: "Burka Muhammed",
    category: "Mobile Wallet",
    themeColor: "#800080"
  },
  {
    id: "cbe",
    name: "Commercial Bank of Ethiopia (CBE)",
    accountNumber: "1000466852841",
    accountName: "Burka Muhammed",
    category: "Bank Transfer",
    themeColor: "#6b1480"
  },
  {
    id: "coop",
    name: "Cooperative Bank of Oromia (Coop)",
    accountNumber: "1005100022147",
    accountName: "Burka Mohammed",
    category: "Bank Transfer",
    themeColor: "#005a9e"
  },
  {
    id: "ebirr",
    name: "E-Birr",
    accountNumber: "0915200879",
    accountName: "Burka Muhammed",
    category: "Mobile Wallet",
    themeColor: "#e67e22"
  },
  {
    id: "awash",
    name: "Awash Bank",
    accountNumber: "014251217719600",
    accountName: "Burka Muhammd",
    category: "Bank Transfer",
    themeColor: "#16a085"
  }
];

export function PaymentScreen({ payments = [], onSubmitPayment, submitting, user }) {
  const [selectedProvider, setSelectedProvider] = useState("telebirr");
  const [verificationMode, setVerificationMode] = useState("details"); // 'details' | 'screenshot'

  // Method A: Transaction Information
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("200");

  // Method B: Receipt Screenshot (Image from device)
  const [receiptScreenshot, setReceiptScreenshot] = useState("");
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [imagePicking, setImagePicking] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const activeMethod = PAYMENT_METHODS.find((m) => m.id === selectedProvider) || PAYMENT_METHODS[0];

  async function handlePickImageFromGallery() {
    setError("");
    setImagePicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Permission to access gallery/photos is required to select your receipt screenshot.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setReceiptScreenshot(dataUri);
        setSelectedImagePreview(asset.uri);
      }
    } catch (err) {
      setError("Failed to select image from device: " + (err.message || "Unknown error"));
    } finally {
      setImagePicking(false);
    }
  }

  async function handleTakePhoto() {
    setError("");
    setImagePicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to capture your physical receipt.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setReceiptScreenshot(dataUri);
        setSelectedImagePreview(asset.uri);
      }
    } catch (err) {
      setError("Failed to capture image: " + (err.message || "Unknown error"));
    } finally {
      setImagePicking(false);
    }
  }

  function handleRemoveImage() {
    setReceiptScreenshot("");
    setSelectedImagePreview(null);
  }

  async function handleSubmit() {
    setError("");
    setSuccessMsg("");

    const parsedAmount = Number(amountPaid) || 200;
    const hasTxInfo = Boolean(transactionNumber.trim() && fullName.trim() && parsedAmount > 0);
    const hasScreenshot = Boolean(receiptScreenshot.trim());

    // Validation Rule:
    // At least one verification method is required:
    // ✓ Transaction Number + Name + Amount OR ✓ Receipt Screenshot
    if (!hasTxInfo && !hasScreenshot) {
      setError(
        "Please provide either:\n• Full Name + Transaction Number + Amount Paid\nOR\n• Browse and select a Receipt Screenshot from your device."
      );
      return;
    }

    try {
      await onSubmitPayment({
        amount: parsedAmount,
        currency: "ETB",
        provider: selectedProvider,
        fullName: fullName.trim() || user?.displayName || "",
        transactionNumber: transactionNumber.trim(),
        transactionReference: transactionNumber.trim(),
        receiptScreenshot: receiptScreenshot.trim(),
        receiptUrl: receiptScreenshot.trim()
      });

      setSuccessMsg("Your payment has been submitted for review.");
      setTransactionNumber("");
      setReceiptScreenshot("");
      setSelectedImagePreview(null);
    } catch (err) {
      setError(err.message || "Failed to submit payment verification.");
    }
  }

  return (
    <View style={styles.container}>
      {/* Plan Header Card */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Student Premium Access</Text>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>200 ETB</Text>
          </View>
        </View>
        <Text style={styles.planSubtitle}>
          Complete preparation for Ethiopian University Entrance Exam (EUEE).
        </Text>
        <View style={styles.perksList}>
          <Text style={styles.perkItem}><Icon color={COLORS.primary} name="checkmark-circle" size={14} />{"  "}All Natural & Social Science Subjects</Text>
          <Text style={styles.perkItem}><Icon color={COLORS.primary} name="checkmark-circle" size={14} />{"  "}Timed National Mock Exams & Solutions</Text>
          <Text style={styles.perkItem}><Icon color={COLORS.primary} name="checkmark-circle" size={14} />{"  "}Mistake Review, Progress Tracking & Leaderboard</Text>
        </View>
      </Card>

      {/* Step 1: Make Payment */}
      <View style={styles.stepSection}>
        <View style={styles.stepBadgeRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 1</Text>
          </View>
          <Text style={styles.stepTitle}>Pay 200 ETB via Any Supported Method</Text>
        </View>

        <Text style={styles.stepDesc}>
          Select your preferred payment method below to view the official account details:
        </Text>

        {/* Provider selector tabs */}
        <View style={styles.providerGrid}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedProvider === method.id;
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                key={method.id}
                onPress={() => setSelectedProvider(method.id)}
                style={[
                  styles.providerTab,
                  isSelected && { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }
                ]}
              >
                <Text
                  style={[
                    styles.providerTabText,
                    isSelected && { color: COLORS.primary, fontWeight: "800" }
                  ]}
                >
                  {method.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Account Detail Box */}
        <Card style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={[styles.accountMethodName, { color: COLORS.primary }]}>
              {activeMethod.name}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{activeMethod.category}</Text>
            </View>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account Number / Phone:</Text>
            <Text selectable style={styles.accountValueBold}>
              {activeMethod.accountNumber}
            </Text>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account Name:</Text>
            <Text style={styles.accountValue}>{activeMethod.accountName}</Text>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Amount to Pay:</Text>
            <Text style={styles.accountAmount}>200 ETB</Text>
          </View>
        </Card>
      </View>

      {/* Step 2: Submit Payment Evidence */}
      <View style={styles.stepSection}>
        <View style={styles.stepBadgeRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 2</Text>
          </View>
          <Text style={styles.stepTitle}>Submit Payment Evidence</Text>
        </View>

        <Text style={styles.stepDesc}>
          Verify your payment using Method A (Transaction Info) OR Method B (Receipt Screenshot):
        </Text>

        <Notice message={error} type="error" />
        <Notice message={successMsg} type="success" />

        {/* Verification method switch */}
        <View style={styles.methodSwitcher}>
          <TouchableOpacity
            onPress={() => setVerificationMode("details")}
            style={[
              styles.methodTab,
              verificationMode === "details" && styles.activeMethodTab
            ]}
          >
            <Text
              style={[
                styles.methodTabText,
                verificationMode === "details" && styles.activeMethodTabText
              ]}
            >
              Method A: Transaction Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setVerificationMode("screenshot")}
            style={[
              styles.methodTab,
              verificationMode === "screenshot" && styles.activeMethodTab
            ]}
          >
            <Text
              style={[
                styles.methodTabText,
                verificationMode === "screenshot" && styles.activeMethodTabText
              ]}
            >
              Method B: Receipt Screenshot
            </Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.formCard}>
          {verificationMode === "details" ? (
            <>
              <Text style={styles.formSectionSubtitle}>
                Enter the details from your payment confirmation SMS / receipt:
              </Text>

              <Input
                label="Full Name *"
                onChangeText={setFullName}
                placeholder="e.g. Abebe Kebede"
                value={fullName}
              />

              <Input
                label="Transaction Number *"
                onChangeText={setTransactionNumber}
                placeholder="e.g. FT23458796 or Telebirr Txn ID"
                value={transactionNumber}
              />

              <Input
                keyboardType="numeric"
                label="Amount Paid *"
                onChangeText={setAmountPaid}
                placeholder="200 ETB"
                value={amountPaid}
              />
            </>
          ) : (
            <>
              <Text style={styles.formSectionSubtitle}>
                Select receipt screenshot from your device gallery or take a clear photo:
              </Text>

              {/* Device Image Picker Actions */}
              <View style={styles.imagePickerContainer}>
                {selectedImagePreview ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: selectedImagePreview }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.previewMeta}>
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}><Icon color={COLORS.success} name="checkmark-circle" size={13} /> Screenshot Selected</Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleRemoveImage}
                        style={styles.removeImageBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeImageText}><Icon color={COLORS.danger} name="close" size={13} /> Remove / Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadButtonsRow}>
                    <TouchableOpacity
                      onPress={handlePickImageFromGallery}
                      style={styles.browseDeviceBtn}
                      activeOpacity={0.8}
                      disabled={imagePicking}
                    >
                      {imagePicking ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <>
                          <Icon color={COLORS.info} name="images-outline" size={28} style={styles.browseIcon} />
                          <Text style={styles.browseBtnText}>Browse from Device</Text>
                          <Text style={styles.browseBtnSub}>Select from Photos / Gallery</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      style={styles.cameraDeviceBtn}
                      activeOpacity={0.8}
                      disabled={imagePicking}
                    >
                      <Icon color={COLORS.purple} name="camera-outline" size={28} style={styles.browseIcon} />
                      <Text style={styles.browseBtnText}>Take Photo</Text>
                      <Text style={styles.browseBtnSub}>Capture paper receipt</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Input
                label="Full Name *"
                onChangeText={setFullName}
                placeholder="e.g. Abebe Kebede"
                value={fullName}
              />

              <Input
                label="Transaction ID / Note (Optional)"
                onChangeText={setTransactionNumber}
                placeholder="e.g. FT23458796 or reference note"
                value={transactionNumber}
              />
            </>
          )}

          <Button
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submitBtn}
          >
            Submit Payment Verification
          </Button>
        </Card>
      </View>

      {/* Payment Status & History Section */}
      <Text style={styles.historySectionTitle}>Your Payment Submissions</Text>

      {payments.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          message="After completing Step 1 and Step 2 above, your status will appear here."
          title="No payments submitted yet"
        />
      ) : (
        payments.map((p) => {
          const isVerified = p.status === "verified";
          const isRejected = p.status === "rejected";
          const isPending = !isVerified && !isRejected;

          return (
            <Card key={p._id || p.transactionReference || Math.random()} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyAmount}>{p.amount || 200} ETB</Text>
                  <Text style={styles.historyMethod}>
                    Method: {(p.provider || "telebirr").toUpperCase()}
                  </Text>
                </View>

                {/* Status Badges */}
                <View
                  style={[
                    styles.statusPill,
                    isVerified && styles.statusVerified,
                    isRejected && styles.statusRejected,
                    isPending && styles.statusPending
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isVerified && styles.textVerified,
                      isRejected && styles.textRejected,
                      isPending && styles.textPending
                    ]}
                  >
                    {isVerified ? "APPROVED" : isRejected ? "REJECTED" : "PENDING"}
                  </Text>
                </View>
              </View>

              {/* Status Explanation Box */}
              <View
                style={[
                  styles.statusBox,
                  isVerified && styles.statusBoxVerified,
                  isRejected && styles.statusBoxRejected,
                  isPending && styles.statusBoxPending
                ]}
              >
                {isPending && (
                  <Text style={styles.statusBoxMessage}>
                    Your payment is under review. Please allow up to 1-2 hours for manual verification.
                  </Text>
                )}

                {isVerified && (
                  <Text style={styles.statusBoxMessage}>
                    Payment Approved. Premium Access Activated.
                  </Text>
                )}

                {isRejected && (
                  <Text style={styles.statusBoxMessage}>
                    Payment Rejected. Reason: {p.reviewNote || "Transaction not found."}
                  </Text>
                )}
              </View>

              {p.fullName ? (
                <Text style={styles.historyMeta}>Payer: {p.fullName}</Text>
              ) : null}

              {p.transactionReference ? (
                <Text style={styles.historyMeta}>Txn Ref: {p.transactionReference}</Text>
              ) : null}

              {p.receiptUrl ? (
                <Text style={styles.historyMeta}>Screenshot attached</Text>
              ) : null}
            </Card>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl
  },
  planCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    marginBottom: SPACING.lg
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs
  },
  planName: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.onPrimary
  },
  pricePill: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full
  },
  priceText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.onPrimary
  },
  planSubtitle: {
    fontSize: 13,
    color: COLORS.onPrimary,
    opacity: 0.9,
    marginBottom: SPACING.md
  },
  perksList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: SPACING.sm,
    gap: 4
  },
  perkItem: {
    fontSize: 12,
    color: COLORS.onPrimary,
    fontWeight: "600"
  },
  stepSection: {
    marginBottom: SPACING.xl
  },
  stepBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs
  },
  stepBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.onPrimary
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.md
  },
  providerTab: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md
  },
  providerTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  accountCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  accountMethodName: {
    fontSize: 16,
    fontWeight: "800"
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm
  },
  accountLabel: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  accountValueBold: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary
  },
  accountValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text
  },
  accountAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.gold
  },
  methodSwitcher: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  methodTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: RADIUS.sm
  },
  activeMethodTab: {
    backgroundColor: COLORS.primary
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  activeMethodTabText: {
    color: COLORS.onPrimary
  },
  formCard: {
    backgroundColor: COLORS.surface
  },
  formSectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.md
  },
  submitBtn: {
    marginTop: SPACING.sm
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.sm
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: SPACING.xl
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4
  },
  historyCard: {
    marginBottom: SPACING.md
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text
  },
  historyMethod: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1
  },
  statusVerified: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success
  },
  statusRejected: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger
  },
  statusPending: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900"
  },
  textVerified: {
    color: COLORS.success
  },
  textRejected: {
    color: COLORS.danger
  },
  textPending: {
    color: COLORS.warning
  },
  statusBox: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm
  },
  statusBoxPending: {
    backgroundColor: COLORS.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning
  },
  statusBoxVerified: {
    backgroundColor: COLORS.successBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success
  },
  statusBoxRejected: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger
  },
  statusBoxMessage: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text
  },
  historyMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  imagePickerContainer: {
    marginBottom: SPACING.md
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: SPACING.sm
  },
  browseDeviceBtn: {
    flex: 1,
    backgroundColor: COLORS.infoBg,
    borderWidth: 1.5,
    borderColor: COLORS.info,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  cameraDeviceBtn: {
    flex: 1,
    backgroundColor: COLORS.purpleBg,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  browseIcon: {
    fontSize: 26,
    marginBottom: 4
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center"
  },
  browseBtnSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: "center"
  },
  previewContainer: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: COLORS.surface
  },
  previewImage: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.surfaceMuted
  },
  previewMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.sm
  },
  selectedBadge: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success
  },
  removeImageBtn: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm
  },
  removeImageText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.danger
  }
});
