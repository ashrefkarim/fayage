import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");

type Step = "email" | "emailNotFound" | "code" | "newPassword" | "success";

const STEPS = ["email", "code", "newPassword"] as const;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { gradients } = useDynamicTheme();
  const { t, isRTL } = useLanguage();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const animateStepChange = (nextStep: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
    setError("");
  };

  const getCurrentStepNumber = () => {
    if (step === "email" || step === "emailNotFound") return 1;
    if (step === "code") return 2;
    if (step === "newPassword") return 3;
    return 3;
  };

  const handleRequestCode = async () => {
    if (!email) {
      setError(t("emailRequired"));
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("invalidEmail"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(new URL("/api/auth/forgot-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === "EMAIL_NOT_FOUND") {
          animateStepChange("emailNotFound");
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        throw new Error(data.error || "Failed to send code");
      }

      setResendCooldown(60);
      animateStepChange("code");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || t("error"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError(t("enterVerificationCode"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(new URL("/api/auth/verify-reset-code", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      animateStepChange("newPassword");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(t("invalidVerificationCode"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError(t("passwordRequired"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(new URL("/api/auth/reset-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      animateStepChange("success");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || t("error"));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await handleRequestCode();
  };

  const handleGoBack = () => {
    if (step === "email" || step === "success") {
      navigation.goBack();
    } else if (step === "emailNotFound") {
      animateStepChange("email");
    } else if (step === "code") {
      animateStepChange("email");
    } else if (step === "newPassword") {
      animateStepChange("code");
    }
  };

  const handleCreateAccount = () => {
    navigation.goBack();
    setTimeout(() => {
      navigation.navigate("Auth");
    }, 100);
  };

  const renderStepIndicator = () => {
    if (step === "success" || step === "emailNotFound") return null;
    
    const currentStep = getCurrentStepNumber();
    
    return (
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3].map((num) => (
          <View key={num} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: num <= currentStep ? theme.primary : theme.backgroundSecondary,
                  borderColor: num <= currentStep ? theme.primary : theme.border,
                },
              ]}
            >
              {num < currentStep ? (
                <Icon name="check" size={14} color="white" />
              ) : (
                <ThemedText
                  style={[
                    styles.stepNumber,
                    { color: num <= currentStep ? "white" : theme.textSecondary },
                  ]}
                >
                  {num}
                </ThemedText>
              )}
            </View>
            {num < 3 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: num < currentStep ? theme.primary : theme.border },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderEmailStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
        <Icon name="mail" size={32} color={theme.primary} />
      </View>
      
      <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
        {t("forgotPassword")}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("enterYourEmail")}
      </ThemedText>

      <View style={styles.inputContainer}>
        <Input
          label={t("email")}
          placeholder="exemple@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail"
        />
      </View>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + "10" }]}>
          <Icon name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        title={t("sendResetCode")}
        onPress={handleRequestCode}
        loading={isLoading}
        style={styles.button}
      />
    </Animated.View>
  );

  const renderEmailNotFoundStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.warning + "15" }]}>
        <Icon name="user-x" size={32} color={theme.warning} />
      </View>
      
      <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
        {t("emailNotFound")}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("wantToCreateAccount")}
      </ThemedText>

      <View style={[styles.emailBadge, { backgroundColor: theme.backgroundSecondary }]}>
        <Icon name="mail" size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.emailBadgeText, { color: theme.text }]}>
          {email}
        </ThemedText>
      </View>

      <Button
        title={t("createNewAccount")}
        onPress={handleCreateAccount}
        style={styles.button}
      />

      <Pressable
        onPress={() => animateStepChange("email")}
        style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Icon name="arrow-left" size={18} color={theme.primary} />
        <ThemedText style={[styles.secondaryButtonText, { color: theme.primary }]}>
          {t("tryAnotherEmail")}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );

  const renderCodeStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.success + "15" }]}>
        <Icon name="check-circle" size={32} color={theme.success} />
      </View>
      
      <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
        {t("checkYourInbox")}
      </ThemedText>
      
      <View style={[styles.emailBadge, { backgroundColor: theme.backgroundSecondary }]}>
        <Icon name="mail" size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.emailBadgeText, { color: theme.text }]}>
          {email}
        </ThemedText>
      </View>

      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("codesentTo")}
      </ThemedText>

      <View style={styles.inputContainer}>
        <Input
          label={t("verificationCode")}
          placeholder="000000"
          value={code}
          onChangeText={(text) => {
            setCode(text.replace(/[^0-9]/g, "").slice(0, 6));
            setError("");
          }}
          keyboardType="number-pad"
          maxLength={6}
          leftIcon="key"
        />
      </View>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + "10" }]}>
          <Icon name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        title={t("verify")}
        onPress={handleVerifyCode}
        loading={isLoading}
        style={styles.button}
      />

      <Pressable
        onPress={handleResendCode}
        disabled={resendCooldown > 0}
        style={({ pressed }) => [
          styles.resendButton,
          { opacity: resendCooldown > 0 ? 0.5 : pressed ? 0.7 : 1 },
        ]}
      >
        <Icon
          name="refresh-cw"
          size={16}
          color={resendCooldown > 0 ? theme.textSecondary : theme.primary}
        />
        <ThemedText
          style={[
            styles.resendText,
            { color: resendCooldown > 0 ? theme.textSecondary : theme.primary },
          ]}
        >
          {resendCooldown > 0
            ? `${t("resendCodeIn")} ${resendCooldown}s`
            : t("resendCode")}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );

  const renderPasswordStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
        <Icon name="lock" size={32} color={theme.primary} />
      </View>
      
      <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
        {t("createSecurePassword")}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("passwordMinChars")}
      </ThemedText>

      <View style={styles.inputContainer}>
        <Input
          label={t("newPassword")}
          placeholder="********"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            setError("");
          }}
          secureTextEntry
          leftIcon="lock"
        />

        <Input
          label={t("confirmPassword")}
          placeholder="********"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry
          leftIcon="check-circle"
        />
      </View>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + "10" }]}>
          <Icon name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        title={t("resetPassword")}
        onPress={handleResetPassword}
        loading={isLoading}
        style={styles.button}
      />
    </Animated.View>
  );

  const renderSuccessStep = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={[styles.successIconContainer, { backgroundColor: theme.success + "15" }]}>
        <View style={[styles.successIconInner, { backgroundColor: theme.success }]}>
          <Icon name="check" size={40} color="white" />
        </View>
      </View>
      
      <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
        {t("passwordResetSuccess")}
      </ThemedText>
      <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t("passwordResetSuccessDescription")}
      </ThemedText>

      <Button
        title={t("backToLogin")}
        onPress={() => navigation.goBack()}
        style={styles.button}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={gradients.primary as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name={isRTL ? "chevron-right" : "chevron-left"} size={24} color="white" />
          </Pressable>
          
          {step !== "success" && step !== "emailNotFound" && (
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepBadgeText}>
                {t("step")} {getCurrentStepNumber()} {t("of")} 3
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Icon name="shield" size={28} color="white" />
          </View>
          <ThemedText type="h1" style={styles.headerTitle}>
            {t("secureReset")}
          </ThemedText>
        </View>
      </LinearGradient>

      <KeyboardAwareScrollViewCompat
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.card, ...Shadows.lg }]}>
          {renderStepIndicator()}
          
          {step === "email" && renderEmailStep()}
          {step === "emailNotFound" && renderEmailNotFoundStep()}
          {step === "code" && renderCodeStep()}
          {step === "newPassword" && renderPasswordStep()}
          {step === "success" && renderSuccessStep()}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  stepBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  headerContent: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    textAlign: "center",
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginTop: -Spacing.xl,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: Spacing.xs,
  },
  formContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: "100%",
  },
  errorText: {
    flex: 1,
  },
  button: {
    width: "100%",
    marginTop: Spacing.md,
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "500",
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
