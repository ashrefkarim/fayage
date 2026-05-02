import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import { Icon, IconName } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";

interface VerificationStep {
  id: string;
  labelKey: string;
  icon: IconName;
  completed: boolean;
}

export default function VerificationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user, updateUser } = useAuth();

  const [steps, setSteps] = useState<VerificationStep[]>([
    { id: "nationalId", labelKey: "nationalId", icon: "credit-card", completed: false },
    { id: "selfie", labelKey: "selfie", icon: "camera", completed: false },
    { id: "vehicleRegistration", labelKey: "vehicleRegistration", icon: "file-text", completed: false },
    { id: "insurance", labelKey: "insurance", icon: "shield", completed: false },
    { id: "drivingLicense", labelKey: "drivingLicense", icon: "award", completed: false },
  ]);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  const handleUpload = async (stepId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s))
    );
  };

  const handleSubmit = async () => {
    if (!allCompleted) return;
    await updateUser({ isVerified: true });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.success, width: `${progress}%` },
            ]}
          />
        </View>
        <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
          {completedCount}/{steps.length} {t("completed")}
        </ThemedText>
      </View>

      {allCompleted ? (
        <View style={styles.successCard}>
          <Image
            source={require("../assets/images/empty-states/verification-success.png")}
            style={styles.successImage}
            resizeMode="contain"
          />
          <ThemedText type="h3" style={styles.successTitle}>
            {t("verificationComplete")}
          </ThemedText>
          <ThemedText style={[styles.successText, { color: theme.textSecondary }]}>
            {t("verified")}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <View
            key={step.id}
            style={[styles.stepCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.stepHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.stepInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View
                  style={[
                    styles.stepNumber,
                    {
                      backgroundColor: step.completed ? theme.success : theme.primary + "20",
                    },
                  ]}
                >
                  {step.completed ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <ThemedText style={[styles.stepNumberText, { color: theme.primary }]}>
                      {index + 1}
                    </ThemedText>
                  )}
                </View>
                <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <ThemedText style={styles.stepLabel}>{t(step.labelKey)}</ThemedText>
                  <ThemedText style={[styles.stepStatus, { color: theme.textSecondary }]}>
                    {step.completed ? t("completed") : t("pendingVerification")}
                  </ThemedText>
                </View>
              </View>
              <Icon name={step.icon} size={24} color={theme.textSecondary} />
            </View>

            {!step.completed ? (
              <Pressable
                onPress={() => handleUpload(step.id)}
                style={({ pressed }) => [
                  styles.uploadButton,
                  {
                    borderColor: theme.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Icon name="upload" size={18} color={theme.primary} />
                <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
                  {t("upload")}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {allCompleted ? (
        <Button onPress={handleSubmit} style={styles.submitButton}>
          {t("submit")}
        </Button>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.sm,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    textAlign: "center",
  },
  successCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  successImage: {
    width: 120,
    height: 120,
  },
  successTitle: {
    textAlign: "center",
  },
  successText: {
    textAlign: "center",
    fontSize: 14,
  },
  stepsList: {
    gap: Spacing.md,
  },
  stepCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  stepHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepInfo: {
    alignItems: "center",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  stepStatus: {
    fontSize: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
